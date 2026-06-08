import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SupplierInvoice } from 'src/finance-hr/account-payable/supplier-invoices/entities/supplier-invoice.entity';
import { SupplierInvoiceStatus } from 'src/finance-hr/account-payable/supplier-invoices/constants/supplier-invoice-status.enum';
import { Item } from 'src/inventory/products-inventory/stocks/items/entities/item.entity';
import { Movement } from 'src/inventory/products-inventory/stocks/movements/entities/movement.entity';
import { MovementsStatus } from 'src/inventory/products-inventory/stocks/movements/constants/movements-status';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import {
  computeWeightedAverageUnitCost,
  formatUnitCost,
} from './utils/weighted-average-cost.util';
import type { ReceiveSupplierInventoryResponseDto } from './dto/receive-supplier-inventory-response.dto';
import type { ReceiveSupplierInventoryLineResultDto } from './dto/receive-supplier-inventory-response.dto';
import { RecipeTheoreticalCostService } from '../products-inventory/recipes/recipe-theoretical-cost.service';
import { StockLevelMonitorService } from '../stock-alerts/stock-level-monitor.service';
import { ProductRecipe } from '../products-inventory/recipes/entities/product-recipe.entity';
import { ProductRecipeLine } from '../products-inventory/recipes/entities/product-recipe-line.entity';

@Injectable()
export class SupplierInvoiceInventoryService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly recipeTheoreticalCostService: RecipeTheoreticalCostService,
    private readonly stockLevelMonitor: StockLevelMonitorService,
  ) {}

  async receiveForInvoice(
    merchantId: number,
    invoiceId: number,
    locationIdOverride?: number,
  ): Promise<ReceiveSupplierInventoryResponseDto> {
    const merchant = await this.dataSource.manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['id', 'companyId', 'defaultSalesStockLocationId'],
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const locationId =
      locationIdOverride ?? merchant.defaultSalesStockLocationId ?? null;
    if (locationId == null) {
      throw new BadRequestException(
        'Default sales stock location is not configured for this merchant; provide locationId',
      );
    }

    const location = await this.dataSource.manager.findOne(Location, {
      where: { id: locationId, merchantId, isActive: true },
    });
    if (!location) {
      throw new BadRequestException(
        `Stock location ${locationId} is missing or not owned by this merchant`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await queryRunner.manager.findOne(SupplierInvoice, {
        where: { id: invoiceId, deleted_at: IsNull() },
        relations: ['items'],
      });

      if (!invoice) {
        throw new NotFoundException('Supplier invoice not found');
      }
      if (invoice.company_id !== merchant.companyId) {
        throw new NotFoundException('Supplier invoice not found');
      }
      if (invoice.status === SupplierInvoiceStatus.CANCELLED) {
        throw new BadRequestException(
          'Cannot receive inventory for a cancelled invoice',
        );
      }
      if (invoice.inventory_received_at != null) {
        throw new ConflictException(
          'Inventory was already received for this supplier invoice',
        );
      }

      const activeLines = (invoice.items ?? []).filter(
        (row) => row.deleted_at == null,
      );
      const inventoryLines = activeLines.filter(
        (row) => row.product_id != null && row.variant_id != null,
      );

      if (inventoryLines.length === 0) {
        throw new BadRequestException(
          'Invoice has no lines with product_id and variant_id for inventory receipt',
        );
      }

      const lineResults: ReceiveSupplierInventoryLineResultDto[] = [];
      const affectedSupplyProductIds = new Set<number>();

      for (const line of inventoryLines) {
        const productId = line.product_id as number;
        const variantId = line.variant_id as number;
        const purchaseUnitPrice = Number(line.unit_price);
        const rawQty = Number(line.quantity);
        const purchasedQty = Math.floor(rawQty);

        if (!Number.isFinite(purchaseUnitPrice) || purchaseUnitPrice < 0) {
          throw new BadRequestException(
            `Invalid unit_price on invoice line ${line.id}`,
          );
        }
        if (purchasedQty < 1) {
          throw new BadRequestException(
            `Invoice line ${line.id} quantity must be at least 1 whole unit for stock (got ${rawQty})`,
          );
        }

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: productId, merchantId, isActive: true },
        });
        if (!product) {
          throw new BadRequestException(
            `Product ${productId} is missing or not owned by this merchant`,
          );
        }

        const variant = await queryRunner.manager.findOne(Variant, {
          where: { id: variantId, productId },
        });
        if (!variant || !variant.isActive) {
          throw new BadRequestException(
            `Variant ${variantId} does not match product ${productId}`,
          );
        }

        let stockItem = await queryRunner.manager
          .createQueryBuilder(Item, 'item')
          .where('item.productId = :productId', { productId })
          .andWhere('item.variantId = :variantId', { variantId })
          .andWhere('item.locationId = :locationId', { locationId })
          .andWhere('item.isActive = :ia', { ia: true })
          .getOne();

        const previousQty = stockItem?.currentQty ?? 0;
        const previousWacc =
          stockItem?.weightedAverageUnitCost != null
            ? Number(stockItem.weightedAverageUnitCost)
            : null;

        const newWacc = computeWeightedAverageUnitCost(
          previousQty,
          previousWacc,
          purchasedQty,
          purchaseUnitPrice,
        );
        const newWaccStr = formatUnitCost(newWacc);
        const newQty = previousQty + purchasedQty;

        if (!stockItem) {
          stockItem = queryRunner.manager.create(Item, {
            productId,
            variantId,
            locationId,
            currentQty: newQty,
            weightedAverageUnitCost: newWaccStr,
            isActive: true,
          });
          stockItem = await queryRunner.manager.save(Item, stockItem);
        } else {
          await queryRunner.manager.update(
            Item,
            { id: stockItem.id },
            {
              currentQty: newQty,
              weightedAverageUnitCost: newWaccStr,
            },
          );
        }

        const movement = queryRunner.manager.create(Movement, {
          stockItemId: stockItem.id,
          quantity: purchasedQty,
          type: MovementsStatus.PURCHASE_ENTRY,
          reference: invoice.invoice_number,
          reason: 'Supplier invoice inventory receipt',
          merchantId,
          supplierInvoiceId: invoice.id,
          unitCost: newWaccStr,
          orderId: null,
          shiftId: null,
          isActive: true,
        });
        const savedMovement = await queryRunner.manager.save(
          Movement,
          movement,
        );

        lineResults.push({
          invoiceItemId: line.id,
          stockItemId: stockItem.id,
          productId,
          variantId,
          previousQty,
          newQty,
          previousWacc,
          newWacc,
          movementId: savedMovement.id,
        });
        affectedSupplyProductIds.add(productId);
      }

      await queryRunner.manager.update(
        SupplierInvoice,
        { id: invoice.id },
        { inventory_received_at: new Date() },
      );

      await this.refreshRecipeCostsForSupplyProducts(
        queryRunner.manager,
        merchantId,
        [...affectedSupplyProductIds],
      );

      await queryRunner.commitTransaction();

      await this.stockLevelMonitor.evaluateStockItems(
        merchantId,
        lineResults.map((l) => l.stockItemId),
      );

      return {
        invoiceId: invoice.id,
        locationId,
        lines: lineResults,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async refreshRecipeCostsForSupplyProducts(
    manager: DataSource['manager'],
    merchantId: number,
    supplyProductIds: number[],
  ): Promise<void> {
    if (supplyProductIds.length === 0) {
      return;
    }

    const recipes = await manager
      .createQueryBuilder(ProductRecipe, 'recipe')
      .innerJoin('recipe.lines', 'line')
      .where('recipe.merchantId = :merchantId', { merchantId })
      .andWhere('line.supplyProductId IN (:...ids)', { ids: supplyProductIds })
      .select(['recipe.id'])
      .distinct(true)
      .getMany();

    for (const recipe of recipes) {
      const lineRows = await manager.find(ProductRecipeLine, {
        where: { recipeId: recipe.id },
      });
      const cached =
        await this.recipeTheoreticalCostService.computeBaseTheoreticalCostCached(
          manager,
          merchantId,
          lineRows,
        );
      await manager.update(
        ProductRecipe,
        { id: recipe.id },
        { theoreticalCostCached: cached },
      );
    }
  }
}
