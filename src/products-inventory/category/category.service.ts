import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import {
  AllCategoryResponse,
  CategoryResponseDto,
  OneCategoryResponse,
} from './dto/category-response.dto';
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
    const { name, merchantId, parentId } = createCategoryDto;

    if (merchantId !== user.merchant.id) ErrorHandler.differentMerchant();

    const existingCategory = await this.categoryRepo.findOne({
      where: { name, merchantId, isActive: true },
    });

    if (existingCategory)
      ErrorHandler.exists(ErrorMessage.CATEGORY_NAME_EXISTS);

    if (merchantId) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: merchantId },
      });
      if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }

    if (parentId) {
      const parentCategory = await this.categoryRepo.findOne({
        where: { id: parentId, merchantId: user.merchant.id, isActive: true },
      });
      if (!parentCategory) ErrorHandler.notFound(ErrorMessage.PARENT_NOT_FOUND);
    }
    try {
      const existingButIsNotActive = await this.categoryRepo.findOne({
        where: { name, merchantId, isActive: false },
      });

      if (existingButIsNotActive) {
        existingButIsNotActive.isActive = true;
        await this.categoryRepo.save(existingButIsNotActive);
        return this.findOne(existingButIsNotActive.id, undefined, 'created');
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
      console.log(error);
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(merchantId: number): Promise<AllCategoryResponse> {
    const categories = await this.categoryRepo.find({
      where: { merchantId, isActive: true }, // Filter by isActive
      relations: ['merchant'],
    });
    const categoryResponseDtos: CategoryResponseDto[] = await Promise.all(
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
      data: categoryResponseDtos,
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

    const whereCondition: { id: number; merchantId?: number; isActive: true } =
      {
        id,
        isActive: true, // Filter by isActive
      };
    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    const category = await this.categoryRepo.findOne({
      where: whereCondition,
      relations: ['merchant'],
    });
    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);

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
        await this.productsInventoryService.findParentCategories(id);
    }

    let response: OneCategoryResponse;
    if (createdUpdateDelete === 'Created') {
      response = {
        statusCode: 201,
        message: `Category ${createdUpdateDelete} successfully`,
        data: result,
      };
    } else if (createdUpdateDelete === 'Updated') {
      response = {
        statusCode: 201,
        message: `Category ${createdUpdateDelete} successfully`,
        data: result,
      };
    } else if (createdUpdateDelete === 'Deleted') {
      response = {
        statusCode: 201,
        message: `Category ${createdUpdateDelete} successfully`,
        data: result,
      };
    } else {
      response = {
        statusCode: 200,
        message: 'Category retrieved successfully',
        data: result,
      };
    }

    return response;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<OneCategoryResponse> {
    const category = await this.categoryRepo.findOneBy({ id, isActive: true });
    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);

    if (user.merchant.id !== category.merchantId)
      ErrorHandler.differentMerchant();

    if (
      updateCategoryDto.merchantId !== undefined &&
      updateCategoryDto.merchantId !== category.merchantId
    )
      ErrorHandler.changedMerchant();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { merchantId, ...updateData } = updateCategoryDto;
    const { name, parentId } = updateData;

    if (name && name !== category.name) {
      const existingCategory = await this.categoryRepo.findOne({
        where: { name, merchantId: category.merchantId, isActive: true },
      });
      if (existingCategory)
        ErrorHandler.exists(ErrorMessage.CATEGORY_NAME_EXISTS);

      if (parentId) {
        const parentCategory = await this.categoryRepo.findOneBy({
          id: parentId,
          isActive: true,
        });
        if (!parentCategory)
          ErrorHandler.notFound(ErrorMessage.PARENT_NOT_FOUND);
      }

      Object.assign(category, updateData);
      await this.categoryRepo.save(category);
    }
    return this.findOne(id, undefined, 'Updated');
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<OneCategoryResponse> {
    // Find the main category
    const category = await this.categoryRepo.findOne({
      where: { id, isActive: true }, // Ensure the category is active
      relations: ['merchant', 'parent'],
    });

    if (!category) ErrorHandler.notFound(ErrorMessage.CATEGORY_NOT_FOUND);

    if (user.merchant.id !== category.merchantId) {
      ErrorHandler.differentMerchant();
    }

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
  }
}
