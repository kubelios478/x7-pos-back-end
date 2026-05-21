import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { PurchaseOrderItem } from '../purchase-order-item/entities/purchase-order-item.entity';
import { PurchaseOrderStatus } from '../purchase-order/constants/purchase-order-status.enum';
import { Variant } from '../variants/entities/variant.entity';
import { Item } from '../stocks/items/entities/item.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { ProductRecipeLine } from './entities/product-recipe-line.entity';
import { RecipeLineType } from './constants/recipe-line-type.enum';
import {
  isRecipeUnitCompatibleWithStockBasis,
  recipeQuantityToCanonicalPerSoldUnit,
} from './utils/recipe-unit-conversion.util';

const PO_STATUSES_FOR_COST: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.COMPLETED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];

function moneyPerPurchaseOrderUnit(poi: PurchaseOrderItem): number | null {
  const qty = Number(poi.quantity);
  if (Number.isFinite(qty) && qty > 0) {
    return Number(poi.totalPrice) / qty;
  }
  const up = Number(poi.unitPrice);
  return Number.isFinite(up) ? up : null;
}

function formatCost(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0.0000';
  }
  return value.toFixed(4);
}

@Injectable()
export class RecipeTheoreticalCostService {
  /**
   * Base theoretical cost per one sold unit of the finished good:
   * {@link RecipeLineType.REQUIRED} and {@link RecipeLineType.OPTIONAL} lines
   * without `modifierId` (see product plan).
   */
  async computeBaseTheoreticalCostCached(
    manager: EntityManager,
    merchantId: number,
    lines: ProductRecipeLine[],
  ): Promise<string | null> {
    const baseLines = lines.filter(
      (l) =>
        l.lineType === RecipeLineType.REQUIRED ||
        (l.lineType === RecipeLineType.OPTIONAL && l.modifierId == null),
    );
    if (baseLines.length === 0) {
      return null;
    }

    const variantIds = [...new Set(baseLines.map((l) => l.supplyVariantId))];
    const variants =
      variantIds.length > 0
        ? await manager.find(Variant, { where: { id: In(variantIds) } })
        : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    let sum = 0;
    for (const line of baseLines) {
      const per = Number(line.quantityPerSoldUnit);
      if (!Number.isFinite(per)) {
        continue;
      }
      const variant = variantById.get(line.supplyVariantId);
      const canonicalPerSold = recipeQuantityToCanonicalPerSoldUnit(
        per,
        line.quantityUnit,
      );

      const moneyPerUnit = await this.resolveSupplyUnitCost(
        manager,
        merchantId,
        line.supplyProductId,
        line.supplyVariantId,
      );
      if (moneyPerUnit == null || !Number.isFinite(moneyPerUnit)) {
        continue;
      }

      let costPerCanonical: number;
      if (
        variant?.stockBasisKind != null &&
        variant.baseUnitsPerStockIncrement != null &&
        isRecipeUnitCompatibleWithStockBasis(
          line.quantityUnit,
          variant.stockBasisKind,
        )
      ) {
        const base = Number(variant.baseUnitsPerStockIncrement);
        if (!Number.isFinite(base) || base <= 0) {
          costPerCanonical = moneyPerUnit;
        } else {
          costPerCanonical = moneyPerUnit / base;
        }
      } else {
        costPerCanonical = moneyPerUnit;
      }

      sum += canonicalPerSold * costPerCanonical;
    }

    if (!Number.isFinite(sum)) {
      return null;
    }
    return formatCost(sum);
  }

  private async resolveSupplyUnitCost(
    manager: EntityManager,
    merchantId: number,
    productId: number,
    variantId: number,
  ): Promise<number | null> {
    const wacc = await this.findStockItemWacc(
      manager,
      merchantId,
      productId,
      variantId,
    );
    if (wacc != null) {
      return wacc;
    }

    const poi = await this.findLatestPurchaseOrderItem(
      manager,
      merchantId,
      productId,
      variantId,
    );
    return poi ? moneyPerPurchaseOrderUnit(poi) : null;
  }

  private async findStockItemWacc(
    manager: EntityManager,
    merchantId: number,
    productId: number,
    variantId: number,
  ): Promise<number | null> {
    const merchant = await manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['id', 'defaultSalesStockLocationId'],
    });
    const locationId = merchant?.defaultSalesStockLocationId;
    if (locationId == null) {
      return null;
    }

    const stockItem = await manager.findOne(Item, {
      where: {
        productId,
        variantId,
        locationId,
        isActive: true,
      },
      select: ['id', 'weightedAverageUnitCost'],
    });
    if (stockItem?.weightedAverageUnitCost == null) {
      return null;
    }
    const value = Number(stockItem.weightedAverageUnitCost);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  private async findLatestPurchaseOrderItem(
    manager: EntityManager,
    merchantId: number,
    productId: number,
    variantId: number,
  ): Promise<PurchaseOrderItem | null> {
    const row = await manager
      .createQueryBuilder(PurchaseOrderItem, 'poi')
      .innerJoin('poi.purchaseOrder', 'po')
      .where('po.merchantId = :merchantId', { merchantId })
      .andWhere('poi.productId = :productId', { productId })
      .andWhere('poi.variantId = :variantId', { variantId })
      .andWhere('poi.isActive = :ia', { ia: true })
      .andWhere('po.isActive = :poa', { poa: true })
      .andWhere('po.status IN (:...statuses)', {
        statuses: PO_STATUSES_FOR_COST,
      })
      .orderBy('po.orderDate', 'DESC')
      .addOrderBy('po.id', 'DESC')
      .select(['poi.id'])
      .getOne();

    if (!row) {
      return null;
    }
    return manager.findOne(PurchaseOrderItem, { where: { id: row.id } });
  }
}
