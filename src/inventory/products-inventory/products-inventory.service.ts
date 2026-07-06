import { Injectable } from '@nestjs/common';
import { Category } from './category/entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './products/entities/product.entity';
import { MovementsService } from './stocks/movements/movements.service';
import { MovementsStatus } from './stocks/movements/constants/movements-status';
import { Item } from './stocks/items/entities/item.entity';

@Injectable()
export class ProductsInventoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,

    private readonly movementsService: MovementsService,
  ) {}

  async returnToStock(productId: number, quantity: number, meta?: any) {
    console.log('ENTER returnToStock', {
      productId,
      quantity,
      meta,
    });

    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    console.log('PRODUCT FOUND', product);

    if (!product) return;

    const item = await this.itemRepo.findOne({
      where: { product: { id: productId } },
      relations: ['product'],
    });

    console.log('ITEM FOUND', item);

    if (!item) {
      console.log('ITEM NOT FOUND');
      return;
    }

    product.stock = Number(product.stock || 0) + quantity;

    console.log('NEW STOCK', product.stock);

    const savedProduct = await this.productRepo.save(product);

    console.log('PRODUCT SAVED', savedProduct);

    await this.movementsService.create(product.merchantId, {
      stockItemId: item.id,
      quantity,
      type: MovementsStatus.RETURN,
      reference: `VOID-${meta?.referenceId}`,
      reason: meta?.reason || 'Kitchen cancellation',
    });

    console.log('MOVEMENT CREATED');
  }

  async registerWaste(productId: number, quantity: number, meta?: any) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });

    if (!product) return;

    // 🔥 MISMO AQUÍ
    const item = await this.itemRepo.findOne({
      where: { product: { id: productId } },
      relations: ['product'],
    });

    if (!item) return;

    await this.movementsService.create(product.merchantId, {
      stockItemId: item.id,
      quantity,
      type: MovementsStatus.WASTE,
      reference: `VOID-${meta?.referenceId}`,
      reason: meta?.reason || 'Kitchen cancellation',
    });
  }

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
