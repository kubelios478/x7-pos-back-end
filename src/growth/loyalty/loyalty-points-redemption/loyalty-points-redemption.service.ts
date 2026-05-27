import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyPointsLock } from './entities/loyalty-points-lock.entity';
import { LoyaltyPointsLockStatus } from './constants/loyalty-points-lock-status.enum';
import { LoyaltyRedeemableBalanceResponseDto } from './dto/loyalty-redeemable-balance-response.dto';
import { CreateLoyaltyPointsLockDto } from './dto/create-loyalty-points-lock.dto';
import { LoyaltyPointsLockResponseDto } from './dto/loyalty-points-lock-response.dto';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { roundMoney } from 'src/restaurant-operations/pos/orders/order-aggregation.util';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyPointsSource } from '../loyalty-points-transaction/constants/loyalty-points-source.enum';
import { LoyaltyRedemptionAuditLog } from './entities/loyalty-redemption-audit-log.entity';
import { OrderPayment } from 'src/restaurant-operations/pos/order-payments/entities/order-payment.entity';
import { EntityManager } from 'typeorm';

export const PAYMENT_METHOD_LOYALTY = 'loyalty';

@Injectable()
export class LoyaltyPointsRedemptionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getRedeemableBalance(
    loyaltyCustomerId: number,
    authenticatedUserMerchantId: number,
  ): Promise<LoyaltyRedeemableBalanceResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access loyalty balances',
      );
    }
    if (!loyaltyCustomerId || loyaltyCustomerId <= 0) {
      throw new BadRequestException('Invalid loyaltyCustomerId');
    }

    const loyaltyCustomer = await this.dataSource.manager.findOne(
      LoyaltyCustomer,
      { where: { id: loyaltyCustomerId, is_active: true } },
    );
    if (!loyaltyCustomer) {
      throw new NotFoundException('Loyalty customer not found');
    }

    const program = await this.dataSource.manager.findOne(LoyaltyProgram, {
      where: { merchantId: authenticatedUserMerchantId, is_active: true },
      order: { created_at: 'ASC' },
    });
    if (!program) {
      throw new NotFoundException('Active loyalty program not found');
    }
    const redeemRate = Number(program.redeem_points_per_currency ?? 0);
    if (!Number.isFinite(redeemRate) || redeemRate <= 0) {
      throw new BadRequestException(
        'Loyalty program redemption exchange rate is not configured',
      );
    }

    const reservedPoints =
      await this.sumActiveReservedPoints(loyaltyCustomerId);
    const currentPoints = Number(loyaltyCustomer.currentPoints ?? 0);
    const availablePoints = Math.max(0, currentPoints - reservedPoints);
    const availableAmount = roundMoney(availablePoints / redeemRate);

    return {
      loyaltyCustomerId: loyaltyCustomer.id,
      currentPoints,
      reservedPoints,
      availablePoints,
      redeemPointsPerCurrency: redeemRate,
      availableAmount,
    };
  }

  async createLock(params: {
    dto: CreateLoyaltyPointsLockDto;
    authenticatedUserMerchantId: number;
    cashierUserId: number;
  }): Promise<LoyaltyPointsLockResponseDto> {
    const { dto, authenticatedUserMerchantId, cashierUserId } = params;
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to reserve points',
      );
    }
    if (!cashierUserId) {
      throw new ForbiddenException('Missing cashier identity');
    }

    const requestedAmount = roundMoney(dto.amount);
    if (requestedAmount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const ttl = dto.expiresInSeconds ?? 120;
    if (!Number.isFinite(ttl) || ttl < 10 || ttl > 600) {
      throw new BadRequestException(
        'expiresInSeconds must be between 10 and 600',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: dto.orderId },
        select: ['id', 'merchant_id', 'customer_id', 'balance_due'],
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
      const balanceDue = Number(order.balance_due ?? 0);
      if (requestedAmount > balanceDue) {
        throw new BadRequestException(
          'Requested redemption amount exceeds order balance due',
        );
      }

      const program = await queryRunner.manager.findOne(LoyaltyProgram, {
        where: { merchantId: authenticatedUserMerchantId, is_active: true },
        order: { created_at: 'ASC' },
      });
      if (!program) {
        throw new NotFoundException('Active loyalty program not found');
      }
      const redeemRate = Number(program.redeem_points_per_currency ?? 0);
      if (!Number.isFinite(redeemRate) || redeemRate <= 0) {
        throw new BadRequestException(
          'Loyalty program redemption exchange rate is not configured',
        );
      }

      const loyaltyCustomer = await queryRunner.manager
        .getRepository(LoyaltyCustomer)
        .createQueryBuilder('lc')
        .setLock('pessimistic_write')
        .where('lc.id = :id', { id: dto.loyaltyCustomerId })
        .andWhere('lc.is_active = true')
        .getOne();

      if (!loyaltyCustomer) {
        throw new NotFoundException('Loyalty customer not found');
      }
      if (
        !order.customer_id ||
        order.customer_id !== loyaltyCustomer.customerId
      ) {
        throw new BadRequestException(
          'Order customer does not match loyalty customer',
        );
      }

      const reservedPoints = await this.sumActiveReservedPointsWithManager(
        queryRunner.manager,
        loyaltyCustomer.id,
      );
      const currentPoints = Number(loyaltyCustomer.currentPoints ?? 0);
      const availablePoints = Math.max(0, currentPoints - reservedPoints);

      const pointsNeeded = Math.ceil(requestedAmount * redeemRate);
      if (pointsNeeded <= 0) {
        throw new BadRequestException('Invalid redemption amount');
      }
      if (availablePoints < pointsNeeded) {
        throw new BadRequestException('Insufficient loyalty points balance');
      }

      const expiresAt = new Date(Date.now() + ttl * 1000);
      const lock = queryRunner.manager.create(LoyaltyPointsLock, {
        merchant_id: authenticatedUserMerchantId,
        loyalty_customer_id: loyaltyCustomer.id,
        order_id: order.id,
        reserved_points: pointsNeeded,
        reserved_amount: requestedAmount,
        status: LoyaltyPointsLockStatus.RESERVED,
        created_by_user_id: cashierUserId,
        expires_at: expiresAt,
        consumed_at: null,
      });
      const saved = await queryRunner.manager.save(lock);

      await queryRunner.commitTransaction();
      return {
        lockId: saved.id,
        reservedPoints: saved.reserved_points,
        reservedAmount: Number(saved.reserved_amount),
        expiresAt: saved.expires_at,
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Consumes a previously created lock inside the provided transaction manager.
   * This is intended to be called from the order payment creation flow.
   */
  async consumeLockWithManager(params: {
    manager: EntityManager;
    lockId: number;
    authenticatedUserMerchantId: number;
    cashierUserId: number;
    orderId: number;
    paymentId: number;
  }): Promise<{ redeemedPoints: number; redeemedAmount: number }> {
    const {
      manager,
      lockId,
      authenticatedUserMerchantId,
      cashierUserId,
      orderId,
      paymentId,
    } = params;

    if (!lockId || lockId <= 0) {
      throw new BadRequestException('loyaltyPointsLockId must be provided');
    }

    const lock = await manager
      .getRepository(LoyaltyPointsLock)
      .createQueryBuilder('l')
      .setLock('pessimistic_write')
      .where('l.id = :id', { id: lockId })
      .getOne();

    if (!lock) throw new NotFoundException('Loyalty points lock not found');
    if (lock.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('Lock does not belong to your merchant');
    }
    if (lock.order_id !== orderId) {
      throw new BadRequestException('Lock does not belong to this order');
    }
    if (lock.status !== LoyaltyPointsLockStatus.RESERVED) {
      throw new BadRequestException('Lock is not available for redemption');
    }
    if (lock.expires_at.getTime() <= Date.now()) {
      lock.status = LoyaltyPointsLockStatus.EXPIRED;
      await manager.save(lock);
      throw new BadRequestException('Lock expired');
    }

    const order = await manager
      .getRepository(Order)
      .createQueryBuilder('o')
      .setLock('pessimistic_write')
      .where('o.id = :id', { id: orderId })
      .select(['o.id', 'o.balance_due'])
      .getOne();

    if (!order) throw new NotFoundException('Order not found');
    const balanceDue = Number(order.balance_due ?? 0);
    if (Number(lock.reserved_amount) > balanceDue) {
      throw new BadRequestException(
        'Requested redemption amount exceeds order balance due',
      );
    }

    const loyaltyCustomer = await manager
      .getRepository(LoyaltyCustomer)
      .createQueryBuilder('lc')
      .setLock('pessimistic_write')
      .where('lc.id = :id', { id: lock.loyalty_customer_id })
      .andWhere('lc.is_active = true')
      .getOne();

    if (!loyaltyCustomer) {
      throw new NotFoundException('Loyalty customer not found');
    }

    const currentPoints = Number(loyaltyCustomer.currentPoints ?? 0);
    if (currentPoints < lock.reserved_points) {
      throw new BadRequestException('Insufficient loyalty points balance');
    }

    loyaltyCustomer.currentPoints = currentPoints - lock.reserved_points;
    await manager.save(loyaltyCustomer);

    const txn = manager.create(LoyaltyPointTransaction, {
      points: -lock.reserved_points,
      source: LoyaltyPointsSource.REDEMPTION,
      description: `Points redeemed for order #${orderId}`,
      loyaltyCustomerId: loyaltyCustomer.id,
      orderId,
      paymentId,
      is_active: true,
    });
    await manager.save(txn);

    const audit = manager.create(LoyaltyRedemptionAuditLog, {
      merchant_id: authenticatedUserMerchantId,
      order_id: orderId,
      loyalty_customer_id: loyaltyCustomer.id,
      loyalty_points_lock_id: lock.id,
      cashier_user_id: cashierUserId,
      redeemed_points: lock.reserved_points,
      redeemed_amount: Number(lock.reserved_amount),
    });
    await manager.save(audit);

    // Mark lock consumed and ensure payment method is set to loyalty.
    lock.status = LoyaltyPointsLockStatus.CONSUMED;
    lock.consumed_at = new Date();
    await manager.save(lock);

    const payment = await manager.findOne(OrderPayment, {
      where: { id: paymentId },
    });
    if (payment) {
      payment.method = PAYMENT_METHOD_LOYALTY;
      payment.amount = Number(lock.reserved_amount);
      await manager.save(payment);
    }

    return {
      redeemedPoints: lock.reserved_points,
      redeemedAmount: Number(lock.reserved_amount),
    };
  }

  private async sumActiveReservedPoints(
    loyaltyCustomerId: number,
  ): Promise<number> {
    return this.sumActiveReservedPointsWithManager(
      this.dataSource.manager,
      loyaltyCustomerId,
    );
  }

  private async sumActiveReservedPointsWithManager(
    manager: import('typeorm').EntityManager,
    loyaltyCustomerId: number,
  ): Promise<number> {
    const raw = await manager
      .getRepository(LoyaltyPointsLock)
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.reserved_points), 0)', 'sum')
      .where('l.loyalty_customer_id = :lc', { lc: loyaltyCustomerId })
      .andWhere('l.status = :status', {
        status: LoyaltyPointsLockStatus.RESERVED,
      })
      .andWhere('l.expires_at > :now', { now: new Date() })
      .getRawOne<{ sum: string }>();

    const sum = raw?.sum ? parseInt(raw.sum, 10) : 0;
    return Number.isFinite(sum) ? sum : 0;
  }
}
