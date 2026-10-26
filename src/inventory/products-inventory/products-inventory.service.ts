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
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) return;

    const item = await this.itemRepo.findOne({
      where: { product: { id: productId } },
      relations: ['product'],
    });
    if (!item) return;

    product.stock = Number(product.stock || 0) + quantity;
    await this.productRepo.save(product);

    await this.movementsService.create(product.merchantId, {
      stockItemId: item.id,
      quantity,
      type: MovementsStatus.RETURN,
      reference: `VOID-${meta?.referenceId}`,
      reason: meta?.reason || 'Kitchen cancellation',
    });
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
    const parents = await this.findParentCategoriesMany([categoryId]);
    return parents.get(categoryId) ?? [];
  }

  /**
   * Los ancestros de varias categorías en una sola consulta, de la raíz hacia abajo
   * (antes, una consulta por categoría y por nivel). Una categoría sin padre no
   * aparece en el mapa.
   */
  public async findParentCategoriesMany(
    categoryIds: number[],
  ): Promise<Map<number, { id: number; parentName: string }[]>> {
    const result = new Map<number, { id: number; parentName: string }[]>();
    if (categoryIds.length === 0) return result;

    // depth < 50 corta un ciclo de padres, que de otro modo no terminaría.
    const rows = await this.categoryRepo.query<
      { start_id: number; id: number; name: string }[]
    >(
      `WITH RECURSIVE ancestors AS (
         SELECT c.id AS start_id, p.id, p.name, p."parentId" AS parent_id, 1 AS depth
         FROM category c
         JOIN category p ON p.id = c."parentId"
         WHERE c.id = ANY($1::int[])
         UNION ALL
         SELECT a.start_id, p.id, p.name, p."parentId", a.depth + 1
         FROM ancestors a
         JOIN category p ON p.id = a.parent_id
         WHERE a.depth < 50
       )
       SELECT start_id, id, name FROM ancestors ORDER BY start_id, depth DESC`,
      [categoryIds],
    );

    for (const row of rows) {
      const startId = Number(row.start_id);
      const chain = result.get(startId) ?? [];
      chain.push({ id: Number(row.id), parentName: row.name });
      result.set(startId, chain);
    }
    return result;
  }
}
