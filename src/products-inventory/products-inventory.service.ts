import { Injectable } from '@nestjs/common';
import { Category } from './category/entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './products/entities/product.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { ProductResponseDto } from './products/dto/product-response.dto';
import { MerchantResponseDto } from '../merchants/dtos/merchant-response.dto';
import { CategoryLittleResponseDto } from '../../prueba/category-little-response.dto';
import { SupplierResponseDto } from './suppliers/dto/supplier-response.dto';

interface IdNameDto {
  id: number;
  name: string;
}

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

  private mapToIdNameDto<T extends { id: number; name: string }>(
    entity: T,
  ): IdNameDto | null {
    if (!entity) return null;
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  private mapToSupplierResponseDto(
    supplier: Supplier,
  ): SupplierResponseDto | null {
    if (!supplier) return null;
    return {
      id: supplier.id,
      name: supplier.name,
      contactInfo: supplier.contactInfo,
    };
  }

  public mapProductToProductResponseDto(
    product: Product,
  ): ProductResponseDto | null {
    if (!product) return null;
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      basePrice: product.basePrice,
      merchant: product.merchant
        ? (this.mapToIdNameDto(product.merchant) as MerchantResponseDto)
        : null,
      category: product.category
        ? (this.mapToIdNameDto(product.category) as CategoryLittleResponseDto)
        : null,
      supplier: product.supplier
        ? this.mapToSupplierResponseDto(product.supplier)
        : null,
    };
  }
}
