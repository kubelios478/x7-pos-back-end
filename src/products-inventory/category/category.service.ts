import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { CategoryResponseDto } from './dto/category-response.dto';
import { ProductsInventoryService } from '../products-inventory.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

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
  ): Promise<CategoryResponseDto> {
    const { name, merchantId, parentId } = createCategoryDto;

    if (merchantId !== user.merchant.id) {
      throw new ForbiddenException(
        'You are not allowed to create categories for this merchant',
      );
    }

    const existingCategory = await this.categoryRepo.findOne({
      where: { name, merchantId, isActive: true },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${name}" already exists for this merchant`,
      );
    }

    if (merchantId) {
      const merchant = await this.merchantRepo.findOne({
        where: { id: merchantId },
      });
      if (!merchant) {
        throw new NotFoundException(`Merchant with ID ${merchantId} not found`);
      }
    }

    if (parentId) {
      const parentCategory = await this.categoryRepo.findOne({
        where: { id: parentId },
      });
      if (!parentCategory) {
        throw new NotFoundException(
          `Parent category with ID ${parentId} not found`,
        );
      }
    }

    const existingButIsNotActive = await this.categoryRepo.findOne({
      where: { name, merchantId, isActive: false },
    });

    if (existingButIsNotActive) {
      existingButIsNotActive.isActive = true;
      await this.categoryRepo.save(existingButIsNotActive);
      return this.findOne(existingButIsNotActive.id);
    } else {
      const newCategory = this.categoryRepo.create({
        name,
        merchantId,
        parentId,
      });
      const savedCategory = await this.categoryRepo.save(newCategory);
      return this.findOne(savedCategory.id);
    }
  }

  async findAll(merchantId: number): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepo.find({
      where: { merchantId, isActive: true }, // Filter by isActive
      relations: ['merchant'],
    });
    return Promise.all(
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
  }

  async findOne(id: number, merchantId?: number): Promise<CategoryResponseDto> {
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
    if (!category) throw new NotFoundException('Category not found');

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

    return result;
  }

  async update(
    user: AuthenticatedUser,
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOneBy({ id, isActive: true }); // Filtrar por isActive
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (user.merchant.id !== category.merchantId) {
      throw new ForbiddenException(
        'You are not allowed to update categories for this merchant',
      );
    }

    if (
      updateCategoryDto.merchantId !== undefined &&
      updateCategoryDto.merchantId !== category.merchantId
    ) {
      throw new ForbiddenException('Merchant ID cannot be changed');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { merchantId, ...updateData } = updateCategoryDto;
    const { name, parentId } = updateData;

    if (name && name !== category.name) {
      const existingCategory = await this.categoryRepo.findOne({
        where: { name, merchantId: category.merchantId, isActive: true }, // Filtrar por isActive
      });
      if (existingCategory) {
        throw new ConflictException(
          `Category with name "${name}" already exists for this merchant`,
        );
      }
    }

    if (parentId) {
      const parentCategory = await this.categoryRepo.findOneBy({
        id: parentId,
        isActive: true, // Filtrar por isActive
      });
      if (!parentCategory) {
        throw new NotFoundException(
          `Parent category with ID ${parentId} not found`,
        );
      }
    }

    Object.assign(category, updateData);
    await this.categoryRepo.save(category);

    return this.findOne(id);
  }

  async remove(
    user: AuthenticatedUser,
    id: number,
  ): Promise<{ message: string }> {
    // Find the main category
    const category = await this.categoryRepo.findOne({
      where: { id, isActive: true }, // Ensure the category is active
      relations: ['merchant', 'parent'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    if (user.merchant.id !== category.merchantId) {
      throw new ForbiddenException(
        'You are not allowed to remove categories for this merchant',
      );
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

    return {
      message: `Category with ID ${id} and all its subcategories were successfully delete`,
    };
  }
}
