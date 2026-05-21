import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { RecipeTheoreticalCostService } from './recipe-theoretical-cost.service';
import { Variant } from '../variants/entities/variant.entity';
import { PurchaseOrderItem } from '../purchase-order-item/entities/purchase-order-item.entity';
import { ProductRecipeLine } from './entities/product-recipe-line.entity';
import { RecipeLineType } from './constants/recipe-line-type.enum';
import { RecipeQuantityUnit } from './constants/recipe-quantity-unit.enum';
import { VariantStockBasisKind } from './constants/variant-stock-basis-kind.enum';

function line(partial: Partial<ProductRecipeLine>): ProductRecipeLine {
  return {
    id: 1,
    recipeId: 1,
    lineType: RecipeLineType.REQUIRED,
    modifierId: null,
    supplyProductId: 10,
    supplyVariantId: 20,
    quantityPerSoldUnit: '1',
    quantityUnit: RecipeQuantityUnit.UNIT,
    recipe: {} as ProductRecipeLine['recipe'],
    modifier: null,
    supplyProduct: {} as ProductRecipeLine['supplyProduct'],
    supplyVariant: {} as ProductRecipeLine['supplyVariant'],
    ...partial,
  } as ProductRecipeLine;
}

describe('RecipeTheoreticalCostService', () => {
  let service: RecipeTheoreticalCostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecipeTheoreticalCostService],
    }).compile();
    service = module.get(RecipeTheoreticalCostService);
  });

  it('uses the latest purchase order row by orderDate', async () => {
    const poiNew: PurchaseOrderItem = {
      id: 2,
      purchaseOrderId: 2,
      productId: 10,
      variantId: 20,
      quantity: 1,
      unitPrice: 5,
      totalPrice: 5,
      purchaseOrder: {} as PurchaseOrderItem['purchaseOrder'],
      product: {} as PurchaseOrderItem['product'],
      variant: {} as PurchaseOrderItem['variant'],
      isActive: true,
    };
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 2 }),
    };
    const manager = {
      find: jest.fn((cls: unknown) => {
        if (cls === Variant) {
          return Promise.resolve([
            {
              id: 20,
              stockBasisKind: VariantStockBasisKind.MASS_GRAM,
              baseUnitsPerStockIncrement: '1000',
            },
          ]);
        }
        return Promise.resolve([]);
      }),
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn((_cls: unknown, opts: { where: { id?: number } }) => {
        if (opts.where.id === 2) {
          return Promise.resolve(poiNew);
        }
        return Promise.resolve(null);
      }),
    } as unknown as EntityManager;

    const lines = [
      line({
        lineType: RecipeLineType.REQUIRED,
        quantityPerSoldUnit: '1',
        quantityUnit: RecipeQuantityUnit.KILOGRAM,
        supplyProductId: 10,
        supplyVariantId: 20,
      }),
    ];

    const cached = await service.computeBaseTheoreticalCostCached(
      manager,
      1,
      lines,
    );

    expect(qb.orderBy).toHaveBeenCalledWith('po.orderDate', 'DESC');
    expect(cached).toBe('5.0000');
  });
});
