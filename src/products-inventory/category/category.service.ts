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

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { name, merchantId, parentId } = createCategoryDto;

    const existingCategory = await this.categoryRepo.findOne({
      where: { name, merchantId },
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

    const newCategory = this.categoryRepo.create({
      name,
      merchantId,
      parentId,
    });

    const savedCategory = await this.categoryRepo.save(newCategory);

    return this.findOne(savedCategory.id);
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepo.find({
      relations: ['merchant', 'parent'],
    });
    return categories.map((category) => {
      const result: CategoryResponseDto = {
        id: category.id,
        name: category.name,
        merchant: category.merchant
          ? {
              name: category.merchant.name,
              email: category.merchant.email,
            }
          : null,
      };
      if (category.parentId) {
        result.parentId = category.parentId;
        result.parentName = category.parent?.name;
      }
      return result;
    });
  }

  async findOne(id: number): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['merchant', 'parent'],
    });
    if (!category) throw new NotFoundException('Category not found');

    const result: CategoryResponseDto = {
      id: category.id,
      name: category.name,
      merchant: category.merchant
        ? {
            name: category.merchant.name,
            email: category.merchant.email,
          }
        : null,
    };

    if (category.parentId) {
      result.parentId = category.parentId;
      result.parentName = category.parent?.name;
    }

    return result;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
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
        where: { name, merchantId: category.merchantId },
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

  async remove(id: number): Promise<{ message: string }> {
    // Buscar la categoría principal
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['merchant', 'parent'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const deleteRecursive = async (categoryId: number): Promise<void> => {
      const subCategories = await this.categoryRepo.find({
        where: { parentId: categoryId },
      });

      for (const sub of subCategories) {
        await deleteRecursive(sub.id);
        await this.categoryRepo.remove(sub);
      }
    };

    await deleteRecursive(category.id);
    await this.categoryRepo.remove(category);

    return {
      message: `Category with ID ${id} and all its subcategories were successfully deleted`,
    };
  }
}
