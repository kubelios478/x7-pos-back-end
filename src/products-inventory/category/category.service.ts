import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  CategoryResponseDto,
  OneCategoryResponse,
} from './dto/category-response.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { AllPaginatedCategories } from './dto/all-paginated-categories.dto';
import { ProductsInventoryService } from '../products-inventory.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly productsInventoryService: ProductsInventoryService,
  ) {}

  async create(
    user: AuthenticatedUser,
    createCategoryDto: CreateCategoryDto,
  ): Promise<OneCategoryResponse> {
    const { name, merchantId = user.merchant.id, parentId } = createCategoryDto;

    const [existingCategory, parentCategory] = await Promise.all([
      this.categoryRepo.findOneBy({ name, merchantId, isActive: true }),
      parentId
        ? this.categoryRepo.findOneBy({
            id: parentId,
            merchantId,
            isActive: true,
          })
        : Promise.resolve(null),
    ]);

    if (!existingCategory) {
      ErrorHandler.exists(ErrorMessage.CATEGORY_NAME_EXISTS);
    }

    if (parentId && !parentCategory) {
      ErrorHandler.notFound(ErrorMessage.PARENT_NOT_FOUND);
    }
    try {
      const existingButIsNotActive = await this.categoryRepo.findOne({
        where: { name, merchantId, isActive: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.categoryRepo.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, undefined, 'Created');
      } else {
        const newCategory = this.categoryRepo.create({
          name,
          merchantId,
          parentId,
        });
        const savedCategory = await this.categoryRepo.save(newCategory);
        return this.findOne(savedCategory.id, undefined, 'Created');
      }
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async findAll(
    query: GetCategoriesQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedCategories> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const queryBuilder = this.categoryRepo
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.merchant', 'merchant')
      .where('category.merchantId = :merchantId', { merchantId })
      .andWhere('category.isActive = :isActive', { isActive: true });

    // 3. Apply optional filters
    if (query.name) {
      queryBuilder.andWhere('LOWER(category.name) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const categories = await queryBuilder
      .orderBy('category.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to CategoryResponseDto (with parent categories)
    const data: CategoryResponseDto[] = await Promise.all(
      categories.map(async (category) => {
        const result: CategoryResponseDto = {
          id: category.id,
          name: category.name,
          merchant: category.merchant
            ? {
                id: category.merchant.id,
                name: category.merchant.name,
              }
            : null,
        };
        if (category.parentId) {
          result.parents =
            await this.productsInventoryService.findParentCategories(
              category.id,
            );
        }
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Categories retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneCategoryResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Category ID id incorrect');
    }

    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const category = await this.categoryRepo.findOne({
      where: whereCondition,
      relations: ['merchant'],
    });
    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);

    const dataForResponse: CategoryResponseDto = {
      id: category.id,
      name: category.name,
      merchant: category.merchant
        ? {
            id: category.merchant.id,
            name: category.merchant.name,
          }
        : null,
    };
    if (category.parentId) {
      dataForResponse.parents =
        await this.productsInventoryService.findParentCategories(id);
    }

    let response: OneCategoryResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Category ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 201,
          message: `Category ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 201,
          message: `Category ${createdUpdateDelete} successfully`,
          data: dataForResponse,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Category retrieved successfully',
          data: dataForResponse,
        };
        break;
    }
    return response;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<OneCategoryResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Category ID id incorrect');

    const { name, merchantId, parentId } = updateCategoryDto;

    if (merchantId !== undefined && user.merchant.id !== merchantId)
      ErrorHandler.differentMerchant();

    const category = await this.categoryRepo.findOneBy({
      id,
      merchantId: user.merchant.id,
      isActive: true,
    });
    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);

    if (merchantId !== undefined && merchantId !== category.merchantId)
      ErrorHandler.changedMerchant();

    if (name !== undefined && name !== category.name) {
      const existingCategory = await this.categoryRepo.findOne({
        where: { name, merchantId: category.merchantId, isActive: true },
      });
      if (existingCategory)
        ErrorHandler.exists(ErrorMessage.CATEGORY_NAME_EXISTS);
    }

    if (parentId !== undefined || parentId !== category.parentId) {
      const parentCategory = await this.categoryRepo.findOneBy({
        id: parentId,
        isActive: true,
        merchantId: category.merchantId,
      });
      if (!parentCategory) ErrorHandler.notFound(ErrorMessage.PARENT_NOT_FOUND);
    }

    Object.assign(category, { name, merchantId, parentId });

    try {
      await this.categoryRepo.save(category);
      return this.findOne(id, undefined, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OneCategoryResponse> {
    if (!id || id <= 0) ErrorHandler.invalidId('Category ID id incorrect');

    // Find the main category
    const category = await this.categoryRepo.findOne({
      where: { id, isActive: true }, // Ensure the category is active
      relations: ['merchant', 'parent'],
    });
    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);

    if (user.merchant.id !== category.merchantId) {
      ErrorHandler.differentMerchant();
    }

    try {
      const hideRecursive = async (categoryId: number): Promise<void> => {
        const subCategories = await this.categoryRepo.find({
          where: { parentId: categoryId, isActive: true }, // Only hide active subcategories
        });

        for (const sub of subCategories) {
          await hideRecursive(sub.id);
          sub.isActive = false;
          await this.categoryRepo.save(sub);
        }
      };

      await hideRecursive(category.id);
      category.isActive = false;
      await this.categoryRepo.save(category);
      return this.findOne(id, undefined, 'Deleted');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
      console.log(error);
    }
  }
}
