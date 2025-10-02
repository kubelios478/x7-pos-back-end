import { Injectable, NotFoundException } from '@nestjs/common';
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
  async create(createCategoryDto: CreateCategoryDto) {
    const merchant = createCategoryDto.merchantId
      ? await this.merchantRepo.findOne({
          where: { id: createCategoryDto.merchantId },
        })
      : undefined;

    console.log(createCategoryDto, merchant);
    return 'This action adds a new category';
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

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    console.log(updateCategoryDto);
    return `This action updates a #${id} category`;
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
