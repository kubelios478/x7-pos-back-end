import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { OrderBusinessStatus } from 'src/restaurant-operations/pos/orders/constants/order-business-status.enum';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyPointsSource } from '../loyalty-points-transaction/constants/loyalty-points-source.enum';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';
import {
  findOrCreateAvailableTier,
  evaluateTierUpgrade,
} from '../loyalty-tier/loyalty-tier.helpers';
import {
  computeEarnedLoyaltyPoints,
  computeNetOrderValueForLoyalty,
} from '../utils/loyalty-points-calculation.util';
import type { OrderFullyPaidPayload } from 'src/inventory/sale-inventory/order-paid.events';
import type { OrderLoyaltyReversalPayload } from 'src/inventory/sale-inventory/order-paid.events';

@Injectable()
export class OrderLoyaltyWalletService {
  private readonly logger = new Logger(OrderLoyaltyWalletService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async processOrderFullyPaid(payload: OrderFullyPaidPayload): Promise<void> {
    const { orderId } = payload;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const claim = await queryRunner.manager
        .createQueryBuilder()
        .update(Order)
        .set({ loyalty_points_awarded_at: new Date() })
        .where('id = :orderId', { orderId })
        .andWhere('loyalty_points_awarded_at IS NULL')
        .andWhere('is_paid = :paid', { paid: true })
        .execute();

      if (!claim.affected) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
      });
      if (!order?.customer_id) {
        await queryRunner.manager.update(
          Order,
          { id: orderId },
          { loyalty_points_awarded_at: null },
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      if (order.status === OrderBusinessStatus.CANCELLED) {
        await queryRunner.manager.update(
          Order,
          { id: orderId },
          { loyalty_points_awarded_at: null },
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      const program = await queryRunner.manager.findOne(LoyaltyProgram, {
        where: { merchantId: order.merchant_id, is_active: true },
        order: { created_at: 'ASC' },
      });
      if (!program) {
        await queryRunner.manager.update(
          Order,
          { id: orderId },
          { loyalty_points_awarded_at: null },
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      const loyaltyCustomer = await this.findOrEnrollLoyaltyCustomer(
        queryRunner.manager,
        program,
        order.customer_id,
        order.merchant_id,
      );
      if (!loyaltyCustomer) {
        await queryRunner.manager.update(
          Order,
          { id: orderId },
          { loyalty_points_awarded_at: null },
        );
        await queryRunner.rollbackTransaction();
        return;
      }

      const tierMultiplier = await this.resolveTierMultiplier(
        queryRunner.manager,
        loyaltyCustomer,
      );
      const netValue = computeNetOrderValueForLoyalty(order);
      const points = computeEarnedLoyaltyPoints(
        netValue,
        program,
        tierMultiplier,
      );

      if (points <= 0) {
        await queryRunner.manager.update(
          Order,
          { id: orderId },
          { loyalty_points_awarded_at: null },
        );
        await queryRunner.commitTransaction();
        return;
      }

      loyaltyCustomer.currentPoints += points;
      loyaltyCustomer.lifetimePoints += points;

      const tierRepo = queryRunner.manager.getRepository(LoyaltyTier);
      const upgradedTier = await evaluateTierUpgrade(loyaltyCustomer, tierRepo);
      if (upgradedTier) {
        loyaltyCustomer.loyaltyTierId = upgradedTier.id;
      }

      await queryRunner.manager.save(loyaltyCustomer);

      const txn = queryRunner.manager.create(LoyaltyPointTransaction, {
        points,
        source: LoyaltyPointsSource.ORDER,
        description: `Points earned for paid order #${order.order_number}`,
        loyaltyCustomerId: loyaltyCustomer.id,
        orderId: order.id,
        is_active: true,
      });
      await queryRunner.manager.save(txn);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Awarded ${points} loyalty points for order ${orderId} (customer ${order.customer_id})`,
      );
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction();
      const e = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Loyalty accrual failed for order ${orderId}: ${e.message}`,
        e.stack,
      );
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async reverseOrderLoyaltyPoints(
    payload: OrderLoyaltyReversalPayload,
  ): Promise<void> {
    const { orderId } = payload;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
      });
      if (!order?.loyalty_points_awarded_at) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const accrual = await queryRunner.manager.findOne(
        LoyaltyPointTransaction,
        {
          where: {
            orderId,
            source: LoyaltyPointsSource.ORDER,
            is_active: true,
          },
          relations: ['loyaltyCustomer'],
          order: { createdAt: 'DESC' },
        },
      );

      if (!accrual || accrual.points <= 0) {
        await queryRunner.manager.update(
          Order,
          { id: orderId },
          { loyalty_points_awarded_at: null },
        );
        await queryRunner.commitTransaction();
        return;
      }

      const existingReversal = await queryRunner.manager.findOne(
        LoyaltyPointTransaction,
        {
          where: {
            orderId,
            source: LoyaltyPointsSource.ORDER_REVERSAL,
            is_active: true,
          },
        },
      );
      if (existingReversal) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const customer = accrual.loyaltyCustomer;
      if (customer) {
        customer.currentPoints = Math.max(
          0,
          customer.currentPoints - accrual.points,
        );
        customer.lifetimePoints = Math.max(
          0,
          customer.lifetimePoints - accrual.points,
        );
        await queryRunner.manager.save(customer);
      }

      accrual.is_active = false;
      await queryRunner.manager.save(accrual);

      const reversalTxn = queryRunner.manager.create(LoyaltyPointTransaction, {
        points: -accrual.points,
        source: LoyaltyPointsSource.ORDER_REVERSAL,
        description: `Points reversed for order #${order.order_number}`,
        loyaltyCustomerId: accrual.loyaltyCustomerId,
        orderId: order.id,
        is_active: true,
      });
      await queryRunner.manager.save(reversalTxn);

      await queryRunner.manager.update(
        Order,
        { id: orderId },
        { loyalty_points_awarded_at: null },
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `Reversed ${accrual.points} loyalty points for order ${orderId}`,
      );
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction();
      const e = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `Loyalty reversal failed for order ${orderId}: ${e.message}`,
        e.stack,
      );
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async findOrEnrollLoyaltyCustomer(
    manager: EntityManager,
    program: LoyaltyProgram,
    customerId: number,
    merchantId: number,
  ): Promise<LoyaltyCustomer | null> {
    const existing = await manager
      .getRepository(LoyaltyCustomer)
      .createQueryBuilder('lc')
      .innerJoin('lc.loyaltyProgram', 'lp')
      .leftJoinAndSelect('lc.loyaltyTier', 'tier')
      .where('lc.customerId = :customerId', { customerId })
      .andWhere('lp.merchantId = :merchantId', { merchantId })
      .andWhere('lc.is_active = true')
      .getOne();

    if (existing) {
      return existing;
    }

    const tierRepo = manager.getRepository(LoyaltyTier);
    const baseTier = await findOrCreateAvailableTier(
      program.id,
      merchantId,
      tierRepo,
    );

    const enrolled = manager.create(LoyaltyCustomer, {
      loyaltyProgramId: program.id,
      customerId,
      loyaltyTierId: baseTier.id,
      currentPoints: 0,
      lifetimePoints: 0,
      is_active: true,
    });
    return manager.save(enrolled);
  }

  private async resolveTierMultiplier(
    manager: EntityManager,
    loyaltyCustomer: LoyaltyCustomer,
  ): Promise<number> {
    if (loyaltyCustomer.loyaltyTier?.multiplier != null) {
      return Number(loyaltyCustomer.loyaltyTier.multiplier);
    }
    if (!loyaltyCustomer.loyaltyTierId) {
      return 1;
    }
    const tier = await manager.findOne(LoyaltyTier, {
      where: { id: loyaltyCustomer.loyaltyTierId },
    });
    return tier ? Number(tier.multiplier) : 1;
  }
}
