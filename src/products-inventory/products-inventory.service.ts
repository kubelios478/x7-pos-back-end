import { Injectable } from '@nestjs/common';
import { Category } from './category/entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsInventoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  public async findParentCategories(
    categoryId: number,
  ): Promise<{ id: number; parentName: string }[]> {
    const categories: { id: number; parentName: string }[] = [];
    let currentCategory = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['parent'],
    });

    while (currentCategory && currentCategory.parent) {
      categories.unshift({
        id: currentCategory.parent.id,
        parentName: currentCategory.parent.name,
      });
      currentCategory = await this.categoryRepo.findOne({
        where: { id: currentCategory.parent.id },
        relations: ['parent'],
      });
    }

    return categories;
  }
}
