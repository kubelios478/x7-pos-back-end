import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Movement } from './entities/movement.entity';
import {
  MovementResponseDto,
  OneMovementResponse,
} from './dto/movement-response.dto';
import { GetMovementsQueryDto } from './dto/get-movements-query.dto';
import { AllPaginatedMovements } from './dto/all-paginated-movements.dto';
import { ItemLittleResponseDto } from '../items/dto/item-response.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Item } from '../items/entities/item.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { ProductRecipe } from '../../recipes/entities/product-recipe.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { StockLevelMonitorService } from '../../../stock-alerts/stock-level-monitor.service';
import { MovementsStatus } from './constants/movements-status';
import { Location } from '../locations/entities/location.entity';
import { Supply } from 'src/inventory/supplies/entities/supply.entity';

/**
 * Weighted average unit cost after adding `incomingQty` units at `incomingCost`. With no
 * stock on hand (or negative stock) the incoming cost is the new average.
 */
function weightedAverageCost(
  onHandQty: number,
  onHandCost: number | string | null | undefined,
  incomingQty: number,
  incomingCost: number | string | null | undefined,
): string {
  const incoming = Number(incomingCost) || 0;
  const onHand = Math.max(0, onHandQty);
  const total = onHand + incomingQty;
  if (onHand === 0 || total <= 0) {
    return incoming.toFixed(4);
  }
  return (
    (onHand * (Number(onHandCost) || 0) + incomingQty * incoming) /
    total
  ).toFixed(4);
}

/** Reference of a reversal movement: `REV-<id of the reversed movement>`. */
const REVERSAL_REFERENCE_PREFIX = 'REV-';
const REVERSAL_MOVEMENT_TYPE = 'REVERSAL';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(ProductRecipe)
    private readonly recipeRepository: Repository<ProductRecipe>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly stockLevelMonitor: StockLevelMonitorService,
  ) {}

  async create(
    merchant_id: number,
    createMovementDto: CreateMovementDto & {
      sourceLocationId?: number | null;
      destinationLocationId?: number | null;
      createdBy?: string | null;
      movementType?: string | null;
      unitCost?: number | string | null;
      supplyId?: number | null;
    },
  ): Promise<OneMovementResponse> {
    const {
      stockItemId,
      quantity,
      type,
      reference,
      reason,
      sourceLocationId,
      destinationLocationId,
      createdBy,
      movementType,
      unitCost,
      supplyId,
    } = createMovementDto;
    const merchantId = merchant_id;

    if (quantity <= 0) {
      throw new BadRequestException(
        'Movement quantity must be greater than 0.',
      );
    }

    const merchant = await this.itemRepository.manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['companyId'],
    });
    const companyId = merchant?.companyId;

    // One transaction with the stock rows locked: concurrent movements on the same item
    // wait for each other instead of overwriting each other's quantity, and a failure
    // halfway leaves neither the stock nor the kardex changed.
    const { savedMovement, touchedItemIds } =
      await this.itemRepository.manager.transaction(async (manager) => {
        const itemRepo = manager.getRepository(Item);
        const movementRepo = manager.getRepository(Movement);

        let item: Item | null = null;

        if (stockItemId && stockItemId > 0) {
          item = await itemRepo
            .createQueryBuilder('item')
            .leftJoinAndSelect('item.product', 'product')
            .leftJoinAndSelect('item.supply', 'supply')
            .leftJoinAndSelect('item.location', 'location')
            .where('item.id = :stockItemId', { stockItemId })
            .andWhere(
              '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
              { merchantId, companyId },
            )
            .andWhere('item.isActive = :isActive', { isActive: true })
            .setLock('pessimistic_write', undefined, ['item'])
            .getOne();
        } else if (supplyId && (sourceLocationId || destinationLocationId)) {
          const targetLocId = (sourceLocationId || destinationLocationId)!;
          // The raw material must be the company's and the location the merchant's.
          const [supplyOwned, locationOwned] = await Promise.all([
            manager.exists(Supply, {
              where: { id: supplyId, company_id: companyId },
            }),
            manager.exists(Location, {
              where: { id: targetLocId, merchantId },
            }),
          ]);
          if (supplyOwned && locationOwned) {
            item = await this.findStockRowForUpdate(manager, {
              supplyId,
              productId: null,
              variantId: null,
              locationId: targetLocId,
            });
            if (!item) {
              const created = await itemRepo.save(
                itemRepo.create({
                  supplyId,
                  locationId: targetLocId,
                  currentQty: 0,
                  minimumQty: 5,
                  isActive: true,
                  weightedAverageUnitCost: unitCost
                    ? String(unitCost)
                    : '0.0000',
                }),
              );
              item = await itemRepo.findOne({
                where: { id: created.id },
                relations: ['supply', 'location'],
              });
            }
          }
        }

        if (!item) {
          throw new NotFoundException(
            'Stock item record not found for the selected raw material and location.',
          );
        }

        // 1. Guard de validación para Transferencias
        if (movementType === 'TRANSFER') {
          if (
            sourceLocationId &&
            destinationLocationId &&
            Number(sourceLocationId) === Number(destinationLocationId)
          ) {
            throw new BadRequestException(
              'Source and destination locations must be different.',
            );
          }
        }

        // 2. Insufficient Stock Guard para TRANSFER, WASTE, POS_DEPLETION o salidas
        const isDecrement =
          movementType === 'TRANSFER' ||
          movementType === 'WASTE' ||
          movementType === 'POS_DEPLETION' ||
          type === MovementsStatus.OUT;
        if (isDecrement) {
          const sourceLocationName = item.location?.name || 'Source Location';
          const availableStock = Number(item.currentQty || 0);
          if (availableStock < quantity) {
            throw new BadRequestException(
              `Insufficient stock in [${sourceLocationName}]. Available: ${availableStock}, Requested: ${quantity}.`,
            );
          }
        }

        // 3. Mutación de existencias según tipo de movimiento
        const isEntry =
          type === MovementsStatus.IN ||
          type === MovementsStatus.RETURN ||
          ['PURCHASE_RECEIPT', 'RETURN'].includes(movementType || '');
        const isTransfer =
          movementType === 'TRANSFER' &&
          destinationLocationId &&
          Number(destinationLocationId) !== item.locationId;

        const oldQty = Number(item.currentQty || 0);
        const touched = [item.id];
        let destinationMovement: Movement | null = null;

        if (isTransfer) {
          const destinationOwned = await manager.exists(Location, {
            where: { id: destinationLocationId, merchantId },
          });
          if (!destinationOwned) {
            throw new NotFoundException('Destination location not found');
          }

          // Restar stock de almacén de origen
          item.currentQty = oldQty - Number(quantity);
          await itemRepo.save(item);

          // Incrementar stock en almacén de destino: the same product/variant or raw
          // material (a null key must match NULL, not "any value").
          let destItem = await this.findStockRowForUpdate(manager, {
            supplyId: item.supplyId ?? null,
            productId: item.productId ?? null,
            variantId: item.variantId ?? null,
            locationId: destinationLocationId,
          });
          if (!destItem) {
            destItem = itemRepo.create({
              supplyId: item.supplyId,
              productId: item.productId,
              variantId: item.variantId,
              locationId: destinationLocationId,
              currentQty: 0,
              minimumQty: 5,
              isActive: true,
              weightedAverageUnitCost: item.weightedAverageUnitCost || '0.0000',
            });
          }
          const destOldQty = Number(destItem.currentQty || 0);
          destItem.weightedAverageUnitCost = weightedAverageCost(
            destOldQty,
            destItem.weightedAverageUnitCost,
            Number(quantity),
            item.weightedAverageUnitCost,
          );
          destItem.currentQty = destOldQty + Number(quantity);
          destItem = await itemRepo.save(destItem);
          touched.push(destItem.id);

          // The destination gets its own kardex line, so its stock is explained too.
          destinationMovement = movementRepo.create({
            stockItemId: destItem.id,
            quantity,
            type: MovementsStatus.IN,
            reference,
            reason,
            merchantId: merchant_id,
            isActive: true,
            sourceLocationId: item.locationId ?? null,
            destinationLocationId,
            createdBy: createdBy ?? null,
            movementType: 'TRANSFER',
            unitCost: item.weightedAverageUnitCost,
          });
        } else if (isEntry) {
          if (unitCost) {
            item.weightedAverageUnitCost = weightedAverageCost(
              oldQty,
              item.weightedAverageUnitCost,
              Number(quantity),
              unitCost,
            );
          }
          item.currentQty = oldQty + Number(quantity);
          await itemRepo.save(item);
        } else {
          // Outflows are checked above when they must not exceed the stock; the rest may
          // leave it negative, but the kardex always records the full quantity.
          item.currentQty = oldQty - Number(quantity);
          await itemRepo.save(item);
        }

        const newMovement = movementRepo.create({
          stockItemId: item.id,
          item,
          quantity,
          type: isEntry ? MovementsStatus.IN : MovementsStatus.OUT,
          reference,
          reason,
          merchantId: merchant_id,
          isActive: true,
          sourceLocationId: sourceLocationId ?? item.locationId ?? null,
          destinationLocationId: destinationLocationId ?? null,
          createdBy: createdBy ?? null,
          movementType:
            movementType ?? (isEntry ? 'PURCHASE_RECEIPT' : 'ADJUSTMENT'),
          unitCost: unitCost ? String(unitCost) : item.weightedAverageUnitCost,
        });

        const saved = await movementRepo.save(newMovement);
        if (destinationMovement) {
          await movementRepo.save(destinationMovement);
        }
        return { savedMovement: saved, touchedItemIds: touched };
      });

    // Monitorear y evaluar alertas de stock mínimo
    try {
      await this.stockLevelMonitor.evaluateStockItems(
        merchantId,
        touchedItemIds,
      );
    } catch (e) {
      console.error('Error evaluating stock levels post movement:', e);
    }

    return this.findOne(savedMovement.id, merchantId, 'Created');
  }

  /** Locks and returns the active stock row of a product/variant or raw material at a location. */
  private async findStockRowForUpdate(
    manager: EntityManager,
    key: {
      supplyId: number | null;
      productId: number | null;
      variantId: number | null;
      locationId: number;
    },
  ): Promise<Item | null> {
    const qb = manager
      .getRepository(Item)
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.supply', 'supply')
      .leftJoinAndSelect('item.location', 'location')
      .where('item.locationId = :locationId', { locationId: key.locationId })
      .andWhere('item.isActive = :isActive', { isActive: true });
    for (const column of ['supplyId', 'productId', 'variantId'] as const) {
      const value = key[column];
      if (value == null) {
        qb.andWhere(`item.${column} IS NULL`);
      } else {
        qb.andWhere(`item.${column} = :${column}`, { [column]: value });
      }
    }
    return qb.setLock('pessimistic_write', undefined, ['item']).getOne();
  }

  async findAll(
    query: GetMovementsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedMovements> {
    // 1. Configure pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // 2. Build query with filters
    const merchant = await this.itemRepository.manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['companyId'],
    });

    const queryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.supply', 'supply')
      .leftJoinAndSelect('item.location', 'itemLocation')
      .leftJoinAndSelect('movement.sourceLocation', 'sourceLocation')
      .leftJoinAndSelect('movement.destinationLocation', 'destinationLocation')
      .leftJoinAndSelect('movement.merchant', 'merchant')
      .where(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        {
          merchantId,
          companyId: merchant?.companyId,
        },
      )
      .andWhere('movement.isActive = :isActive', { isActive: true });

    if (query.itemName) {
      queryBuilder.andWhere(
        '(LOWER(product.name) LIKE LOWER(:itemName) OR LOWER(supply.name) LIKE LOWER(:itemName))',
        { itemName: `%${query.itemName}%` },
      );
    }

    if (query.itemId) {
      queryBuilder.andWhere('item.id = :itemId', {
        itemId: query.itemId,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('movement.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('movement.createdAt <= :endDate', {
        endDate: end,
      });
    }

    if (query.movementType) {
      if (
        query.movementType === 'PURCHASE_RECEIPT' ||
        query.movementType === 'PURCHASE'
      ) {
        queryBuilder.andWhere(
          'movement.movementType IN (:...purchaseMovementTypes)',
          {
            purchaseMovementTypes: [
              'PURCHASE_RECEIPT',
              'PURCHASE_RECEIPT_CORRECTION',
              'PURCHASE_CORRECTION',
              'PURCHASE_ENTRY',
            ],
          },
        );
      } else {
        queryBuilder.andWhere('movement.movementType = :movementType', {
          movementType: query.movementType,
        });
      }
    }

    if (query.supplyId) {
      queryBuilder.andWhere('item.supplyId = :supplyId', {
        supplyId: query.supplyId,
      });
    }

    // 4. Get total records
    const total = await queryBuilder.getCount();

    // 5. Apply pagination and sorting
    const movements = await queryBuilder
      .orderBy('movement.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // 6. Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // 7. Map to MovementResponseDto
    const data: MovementResponseDto[] = await Promise.all(
      movements.map((movement) => {
        const result: MovementResponseDto = {
          id: movement.id,
          item: movement.item
            ? ({
                id: movement.item.id,
                currentQty: movement.item.currentQty,
                product: movement.item.product
                  ? { name: movement.item.product.name }
                  : null,
                supply: movement.item.supply
                  ? { name: movement.item.supply.name }
                  : null,
                location: movement.item.location
                  ? {
                      id: movement.item.location.id,
                      name: movement.item.location.name,
                    }
                  : null,
              } as any)
            : null,
          quantity: movement.quantity,
          type: movement.type,
          reference: movement.reference,
          reason: movement.reason,
          sourceLocationId: movement.sourceLocationId,
          sourceLocationName:
            movement.sourceLocation?.name ||
            movement.item?.location?.name ||
            null,
          destinationLocationId: movement.destinationLocationId,
          destinationLocationName: movement.destinationLocation?.name || null,
          unitCost: movement.unitCost
            ? String(movement.unitCost)
            : movement.item?.weightedAverageUnitCost || null,
          createdBy: movement.createdBy,
          movementType: movement.movementType,
          merchant: movement.merchant
            ? {
                id: movement.merchant.id,
                name: movement.merchant.name,
              }
            : null,
          createdAt: movement.createdAt,
        };
        return result;
      }),
    );

    return {
      statusCode: 200,
      message: 'Movements retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId?: number,
    createdUpdateDelete?: string,
  ): Promise<OneMovementResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Movement ID is incorrect');
    }

    const whereCondition: {
      id: number;
      merchantId?: number;
      isActive: boolean;
    } = {
      id,
      isActive: createdUpdateDelete === 'Deleted' ? false : true,
    };

    if (merchantId !== undefined) {
      whereCondition.merchantId = merchantId;
    }

    let companyId: number | undefined;
    if (merchantId !== undefined) {
      const merchant = await this.itemRepository.manager.findOne(Merchant, {
        where: { id: merchantId },
        select: ['companyId'],
      });
      companyId = merchant?.companyId;
    }

    const movementQueryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.supply', 'supply')
      .leftJoinAndSelect('item.location', 'itemLocation')
      .leftJoinAndSelect('movement.sourceLocation', 'sourceLocation')
      .leftJoinAndSelect('movement.destinationLocation', 'destinationLocation')
      .leftJoinAndSelect('movement.merchant', 'merchant')
      .where('movement.id = :id', { id })
      .andWhere('movement.isActive = :isActive', {
        isActive: whereCondition.isActive,
      });

    if (merchantId !== undefined) {
      movementQueryBuilder.andWhere(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId, companyId },
      );
    }

    const movement = await movementQueryBuilder.getOne();

    if (!movement) {
      ErrorHandler.notFound(ErrorMessage.MOVEMENT_NOT_FOUND);
    }

    const result: MovementResponseDto = {
      id: movement.id,
      item: movement.item
        ? ({
            id: movement.item.id,
            currentQty: movement.item.currentQty,
            product: movement.item.product
              ? { name: movement.item.product.name }
              : null,
            supply: movement.item.supply
              ? { name: movement.item.supply.name }
              : null,
            location: movement.item.location
              ? {
                  id: movement.item.location.id,
                  name: movement.item.location.name,
                }
              : null,
          } as any)
        : null,
      quantity: movement.quantity,
      type: movement.type,
      reference: movement.reference,
      reason: movement.reason,
      sourceLocationId: movement.sourceLocationId,
      sourceLocationName:
        movement.sourceLocation?.name || movement.item?.location?.name || null,
      destinationLocationId: movement.destinationLocationId,
      destinationLocationName: movement.destinationLocation?.name || null,
      unitCost: movement.unitCost
        ? String(movement.unitCost)
        : movement.item?.weightedAverageUnitCost || null,
      createdBy: movement.createdBy,
      movementType: movement.movementType,
      merchant: movement.merchant
        ? {
            id: movement.merchant.id,
            name: movement.merchant.name,
          }
        : null,
      createdAt: movement.createdAt,
    };

    let response: OneMovementResponse;

    switch (createdUpdateDelete) {
      case 'Created':
        response = {
          statusCode: 201,
          message: `Movement ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Updated':
        response = {
          statusCode: 200,
          message: `Movement ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      case 'Deleted':
        response = {
          statusCode: 200,
          message: `Movement ${createdUpdateDelete} successfully`,
          data: result,
        };
        break;
      default:
        response = {
          statusCode: 200,
          message: 'Movement retrieved successfully',
          data: result,
        };
        break;
    }
    return response;
  }

  /**
   * Active movement of the merchant: product stock of the merchant, or raw material
   * (supply) stock of its company — the same scope as findOne().
   */
  private async findActiveForMerchantOrFail(
    id: number,
    merchantId: number,
  ): Promise<Movement> {
    const merchant = await this.itemRepository.manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['companyId'],
    });

    const movement = await this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.item', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.supply', 'supply')
      .where('movement.id = :id', { id })
      .andWhere(
        '(product.merchantId = :merchantId OR supply.company_id = :companyId)',
        { merchantId, companyId: merchant?.companyId },
      )
      .andWhere('movement.isActive = :isActive', { isActive: true })
      .getOne();

    if (!movement) {
      ErrorHandler.notFound(ErrorMessage.MOVEMENT_NOT_FOUND);
    }
    return movement;
  }

  /**
   * The kardex is append-only: only the descriptive fields of a movement can change.
   * Quantity, type and stock item are fixed (the DTO rejects them); a wrong movement
   * is corrected by reversing it (remove) or with a new adjustment.
   */
  async update(
    id: number,
    merchant_id: number,
    updateMovementDto: UpdateMovementDto,
  ): Promise<OneMovementResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Movement ID is incorrect');
    }
    const { reference, reason } = updateMovementDto;

    const movement = await this.findActiveForMerchantOrFail(id, merchant_id);

    if (reference !== undefined) {
      movement.reference = reference;
    }
    if (reason !== undefined) {
      movement.reason = reason;
    }

    const updatedMovement = await this.movementRepository.save(movement);

    return this.findOne(updatedMovement.id, merchant_id, 'Updated');
  }

  /**
   * Reverses a movement: records the opposite movement, which puts the stock back, and
   * keeps both in the kardex. Movements generated by another document (a sale, a supplier
   * invoice, a purchase order, a transfer) must be corrected from that document.
   */
  async remove(id: number, merchant_id: number): Promise<OneMovementResponse> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('Movement ID is incorrect');
    }
    const merchantId = merchant_id;

    const movement = await this.findActiveForMerchantOrFail(id, merchantId);

    const generatedBy = MovementsService.sourceDocumentOf(movement);
    if (generatedBy) {
      throw new BadRequestException(
        `Movement #${id} was generated by ${generatedBy}; correct it from there instead of reversing it.`,
      );
    }

    const reversalReference = `${REVERSAL_REFERENCE_PREFIX}${id}`;
    const alreadyReversed = await this.movementRepository.exists({
      where: { reference: reversalReference, isActive: true },
    });
    if (alreadyReversed) {
      throw new ConflictException(`Movement #${id} was already reversed`);
    }

    const reversal = await this.create(merchantId, {
      stockItemId: movement.stockItemId,
      quantity: movement.quantity,
      type:
        movement.type === MovementsStatus.IN
          ? MovementsStatus.OUT
          : MovementsStatus.IN,
      movementType: REVERSAL_MOVEMENT_TYPE,
      reference: reversalReference,
      reason: `Reversal of movement #${id}`,
    });

    return {
      ...reversal,
      statusCode: 200,
      message: `Movement #${id} reversed successfully`,
    };
  }

  /** Name of the document a movement came from, or null for a manual movement. */
  private static sourceDocumentOf(movement: Movement): string | null {
    if (movement.reference?.startsWith(REVERSAL_REFERENCE_PREFIX)) {
      return 'a reversal';
    }
    if (
      movement.orderId != null ||
      movement.type === MovementsStatus.OUT_FOR_SALE ||
      movement.movementType === 'POS_DEPLETION'
    ) {
      return 'a sale';
    }
    if (
      movement.supplierInvoiceId != null ||
      movement.type === MovementsStatus.PURCHASE_ENTRY
    ) {
      return 'a supplier invoice';
    }
    if (
      movement.reference?.startsWith('PO-') ||
      movement.movementType === 'PURCHASE_RECEIPT_CORRECTION'
    ) {
      return 'a purchase order';
    }
    if (movement.movementType === 'TRANSFER') {
      return 'a transfer';
    }
    return null;
  }

  async depleteFromOrder(
    merchantId: number,
    orderId: number,
  ): Promise<{ success: boolean; movementsCount: number }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, merchant_id: merchantId },
      relations: ['orderItems'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const merchant = await this.itemRepository.manager.findOne(Merchant, {
      where: { id: merchantId },
      select: ['defaultSalesStockLocationId'],
    });

    let defaultLocationId = merchant?.defaultSalesStockLocationId;
    if (!defaultLocationId) {
      const firstLocation = await this.itemRepository.manager.findOne(
        Location,
        {
          where: { merchantId, isActive: true },
          order: { id: 'ASC' },
        },
      );
      defaultLocationId = firstLocation?.id;
    }

    if (!defaultLocationId) {
      return { success: false, movementsCount: 0 };
    }

    let movementsCount = 0;
    const evaluatedStockIds = new Set<number>();

    for (const orderItem of order.orderItems || []) {
      let recipe: ProductRecipe | null = null;

      if (orderItem.variant_id) {
        recipe = await this.recipeRepository.findOne({
          where: {
            merchantId,
            finishedProductId: orderItem.product_id,
            finishedVariantId: orderItem.variant_id,
          },
          relations: ['lines', 'lines.rawMaterial'],
        });
      }

      if (!recipe) {
        recipe = await this.recipeRepository.findOne({
          where: {
            merchantId,
            finishedProductId: orderItem.product_id,
          },
          relations: ['lines', 'lines.rawMaterial'],
        });
      }

      if (!recipe || !recipe.lines) {
        continue;
      }

      for (const line of recipe.lines) {
        if (!line.rawMaterialId) {
          continue;
        }

        const qtyPerUnit = Number(
          line.quantityPerSoldUnit || line.quantity || 0,
        );
        const quantityToDeduct = qtyPerUnit * Number(orderItem.quantity || 1);
        if (quantityToDeduct <= 0) {
          continue;
        }

        // Buscar el stock_item del ingrediente en el almacén de venta por defecto
        let stockItem = await this.itemRepository.findOne({
          where: {
            supplyId: line.rawMaterialId,
            locationId: defaultLocationId,
            isActive: true,
          },
        });

        if (!stockItem) {
          // Si no existe el stock_item, lo creamos con cantidad 0 para que quede registro
          stockItem = this.itemRepository.create({
            supplyId: line.rawMaterialId,
            locationId: defaultLocationId,
            currentQty: 0,
            minimumQty: 5,
            isActive: true,
            weightedAverageUnitCost: '0.0000',
          });
          stockItem = await this.itemRepository.save(stockItem);
        }

        // Decrementar el stock
        stockItem.currentQty = Math.max(
          0,
          Number(stockItem.currentQty || 0) - quantityToDeduct,
        );
        await this.itemRepository.save(stockItem);
        evaluatedStockIds.add(stockItem.id);

        // Crear el movimiento de stock auditado
        const movement = this.movementRepository.create({
          stockItemId: stockItem.id,
          quantity: Math.ceil(quantityToDeduct),
          type: MovementsStatus.OUT,
          reference: `POS Order #${order.order_number || orderId}`,
          reason: 'Automatic recipe depletion from POS sale',
          merchantId,
          isActive: true,
          sourceLocationId: defaultLocationId,
          createdBy: 'POS System',
          movementType: 'POS_DEPLETION',
          orderId: order.id,
        });

        await this.movementRepository.save(movement);
        movementsCount++;
      }
    }

    if (evaluatedStockIds.size > 0) {
      await this.stockLevelMonitor.evaluateStockItems(
        merchantId,
        Array.from(evaluatedStockIds),
      );
    }

    return { success: true, movementsCount };
  }
}
