import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CashMovement } from './entities/cash-movement.entity';
import { CashMovementType } from './constants/cash-movement-type.enum';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashMovementResponseDto } from './dto/cash-movement-response.dto';
import { CashShift } from '../cash-shifts/entities/cash-shift.entity';
import { CashShiftStatus } from '../cash-shifts/constants/cash-shift-status.enum';
import { CashShiftRepository } from '../cash-shifts/cash-shift.repository';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { TipSettlement } from '../../tips/tip-settlements/entities/tip-settlement.entity';
import { SettlementMethod } from '../../tips/tip-settlements/constants/settlement-method.enum';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { MailService } from '../../../mail/mail.service';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';

@Injectable()
export class CashMovementsService {
  private readonly logger = new Logger(CashMovementsService.name);

  constructor(
    @InjectRepository(CashMovement)
    private readonly cashMovementRepo: Repository<CashMovement>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepo: Repository<CashDrawer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly cashShiftRepo: CashShiftRepository,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) { }

  /**
   * Records an expense (outflow) from the register for an active shift.
   * Validates shift status, available cash balance, and updates the cash drawer balance.
   */
  async recordExpense(
    shiftId: number,
    dto: CreateCashMovementDto,
    userId: number,
    merchantId: number,
  ): Promise<{ statusCode: number; message: string; data: CashMovementResponseDto }> {
    if (!merchantId) {
      throw new ForbiddenException('User must belong to a merchant');
    }

    const shift = await this.cashShiftRepo.findOne({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException(`Cash shift with ID ${shiftId} not found`);
    }

    if (shift.merchantId !== merchantId) {
      throw new ForbiddenException('You can only record expenses for shifts belonging to your merchant');
    }

    if (shift.status !== CashShiftStatus.OPEN) {
      throw new BadRequestException(
        `The cash register shift is ${shift.status.toLowerCase()}. Expenses can only be recorded if there is a cash register shift in OPEN status.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Pessimistic write lock on cash shift to prevent race conditions
      const lockedShift = await queryRunner.manager.findOne(CashShift, {
        where: { id: shiftId, status: CashShiftStatus.OPEN },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedShift) {
        throw new BadRequestException('The active cash shift is no longer open.');
      }

      // Calculate live balance of standard transactions (sales, refunds, etc.) at this moment
      const txResult = await queryRunner.manager
        .createQueryBuilder(CashShift, 'cs')
        .leftJoin(
          'cash_transactions',
          'ct',
          'ct.shift_id = cs.id AND ct.status = :activeStatus',
          { activeStatus: 'active' },
        )
        .select(
          `(
            COALESCE(cs.opening_balance, 0)
            + COALESCE(SUM(CASE WHEN ct.type IN ('sale', 'adjustment_up') THEN ct.amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN ct.type IN ('refund', 'withdrawal', 'adjustment_down') THEN ct.amount ELSE 0 END), 0)
          )`,
          'txBalance',
        )
        .where('cs.id = :shiftId', { shiftId: lockedShift.id })
        .groupBy('cs.id')
        .addGroupBy('cs.opening_balance')
        .getRawOne<{ txBalance: string }>();

      let liveBalance = txResult ? Number(txResult.txBalance) : Number(lockedShift.openingBalance);

      // Deduct previously recorded expenses (outflow) in cash_movements for this shift
      const movementsResult = await queryRunner.manager
        .createQueryBuilder(CashMovement, 'cm')
        .select(
          `SUM(CASE WHEN cm.type = 'OUTFLOW' THEN cm.amount ELSE -cm.amount END)`,
          'movementSum',
        )
        .where('cm.shift_id = :shiftId', { shiftId: lockedShift.id })
        .getRawOne<{ movementSum: string | null }>();

      const movementSum = Number(movementsResult?.movementSum ?? 0);

      // Deduct previously recorded tip settlements (cash) for this shift
      const tipSettlementsResult = await queryRunner.manager
        .createQueryBuilder(TipSettlement, 'ts')
        .select('SUM(ts.total_amount)', 'tipSettlementSum')
        .where('ts.shift_id = :shiftId AND ts.settlement_method = :method', {
          shiftId: lockedShift.id,
          method: SettlementMethod.CASH,
        })
        .getRawOne<{ tipSettlementSum: string | null }>();

      const tipSettlementSum = Number(tipSettlementsResult?.tipSettlementSum ?? 0);
      liveBalance = liveBalance - movementSum - tipSettlementSum;

      // Balance validation: the expense amount must not exceed the available cash in the register
      if (dto.amount > liveBalance) {
        throw new BadRequestException(
          `The expense amount of ${dto.amount} exceeds the available cash in the register (${liveBalance}).`,
        );
      }

      // Lock and update associated cash drawer (current_balance)
      const cashDrawer = await queryRunner.manager.findOne(CashDrawer, {
        where: { id: lockedShift.cashDrawerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cashDrawer) {
        throw new NotFoundException(`Cash drawer associated with this shift not found`);
      }

      const newBalance = Number(cashDrawer.current_balance) - Number(dto.amount);
      if (newBalance < 0) {
        throw new BadRequestException('Expense would result in a negative balance for the cash drawer');
      }

      cashDrawer.current_balance = newBalance;
      await queryRunner.manager.save(CashDrawer, cashDrawer);

      // Create cash movement record
      const movement = queryRunner.manager.getRepository(CashMovement).create({
        shiftId: lockedShift.id,
        amount: dto.amount,
        reason: dto.reason,
        receiptPhoto: dto.receiptPhoto ?? null,
        userId,
        type: CashMovementType.OUTFLOW,
      });

      const savedMovement = await queryRunner.manager.save(CashMovement, movement);

      await queryRunner.commitTransaction();

      return {
        statusCode: 201,
        message: 'Expense recorded successfully',
        data: this.format(savedMovement),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Records a manual cash inflow (not from sales) to the active shift register.
   * Adds the amount to the cash drawer balance, creates a CashMovement INFLOW record,
   * writes an audit log, and notifies all MERCHANT_ADMIN users via email.
   */
  async recordInflow(
    shiftId: number,
    dto: CreateCashMovementDto,
    userId: number,
    merchantId: number,
  ): Promise<{ statusCode: number; message: string; data: CashMovementResponseDto }> {
    if (!merchantId) {
      throw new ForbiddenException('User must belong to a merchant');
    }

    const shift = await this.cashShiftRepo.findOne({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException(`Cash shift with ID ${shiftId} not found`);
    }

    if (shift.merchantId !== merchantId) {
      throw new ForbiddenException('You can only record inflows for shifts belonging to your merchant');
    }

    if (shift.status !== CashShiftStatus.OPEN) {
      throw new BadRequestException(
        `The cash register shift is ${shift.status.toLowerCase()}. Inflows can only be recorded if there is a cash register shift in OPEN status.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Pessimistic write lock on cash shift to prevent race conditions
      const lockedShift = await queryRunner.manager.findOne(CashShift, {
        where: { id: shiftId, status: CashShiftStatus.OPEN },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedShift) {
        throw new BadRequestException('The active cash shift is no longer open.');
      }

      // Lock and update associated cash drawer (current_balance)
      const cashDrawer = await queryRunner.manager.findOne(CashDrawer, {
        where: { id: lockedShift.cashDrawerId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cashDrawer) {
        throw new NotFoundException(`Cash drawer associated with this shift not found`);
      }

      // Cash Balance Impact: add the amount to the current balance of the active shift drawer
      cashDrawer.current_balance = Number(cashDrawer.current_balance) + Number(dto.amount);
      await queryRunner.manager.save(CashDrawer, cashDrawer);

      // Create cash movement INFLOW record
      const movement = queryRunner.manager.getRepository(CashMovement).create({
        shiftId: lockedShift.id,
        amount: dto.amount,
        reason: dto.reason,
        receiptPhoto: dto.receiptPhoto ?? null,
        userId,
        type: CashMovementType.INFLOW,
      });

      const savedMovement = await queryRunner.manager.save(CashMovement, movement);

      await queryRunner.commitTransaction();

      // AC 2: Write structured compliance audit log
      this.logger.log(
        `[AUDIT LOG] Manual Cash Inflow Recorded - Merchant: ${merchantId}, Shift: ${lockedShift.id}, User: ${userId}, Amount: ${dto.amount}, Reason: "${dto.reason}"`,
      );

      // AC 2: Fetch and notify all MERCHANT_ADMIN users by email
      const admins = await this.userRepo.find({
        where: {
          merchant: { id: merchantId },
          role: UserRole.MERCHANT_ADMIN,
        },
      });

      for (const admin of admins) {
        if (admin.email) {
          try {
            await this.mailService.sendMail({
              to: admin.email,
              subject: `[Audit Notification] Manual Cash Inflow Recorded - Shift ID ${lockedShift.id}`,
              html: `
                <h3>Manual Cash Inflow Recorded</h3>
                <p>Hello ${admin.username || 'Admin'},</p>
                <p>A manual cash inflow (not from sales) has been recorded in the system:</p>
                <ul>
                  <li><strong>Shift ID:</strong> ${lockedShift.id}</li>
                  <li><strong>Merchant ID:</strong> ${merchantId}</li>
                  <li><strong>Recorded By User ID:</strong> ${userId}</li>
                  <li><strong>Amount:</strong> $${dto.amount.toFixed(2)}</li>
                  <li><strong>Reason:</strong> ${dto.reason}</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
                </ul>
                <p>This notification is sent for compliance and audit tracking.</p>
              `,
            });
          } catch (mailError) {
            this.logger.error(`Failed to send compliance mail to ${admin.email}: ${(mailError as any).message}`);
          }
        }
      }

      return {
        statusCode: 201,
        message: 'Cash inflow recorded successfully',
        data: this.format(savedMovement),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Returns all movements associated with a specific shift.
   */
  async findByShift(
    shiftId: number,
    merchantId: number,
  ): Promise<{ statusCode: number; data: CashMovementResponseDto[] }> {
    if (!merchantId) {
      throw new ForbiddenException('User must belong to a merchant');
    }

    const shift = await this.cashShiftRepo.findOne({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException(`Cash shift with ID ${shiftId} not found`);
    }

    if (shift.merchantId !== merchantId) {
      throw new ForbiddenException('You can only view movements for shifts belonging to your merchant');
    }

    const movements = await this.cashMovementRepo.find({
      where: { shiftId },
      order: { createdAt: 'DESC' },
    });

    return {
      statusCode: 200,
      data: movements.map((m) => this.format(m)),
    };
  }

  private format(movement: CashMovement): CashMovementResponseDto {
    return {
      id: movement.id,
      shiftId: movement.shiftId,
      amount: Number(movement.amount),
      reason: movement.reason,
      receiptPhoto: movement.receiptPhoto,
      userId: movement.userId,
      type: movement.type,
      createdAt: movement.createdAt,
    };
  }
}
