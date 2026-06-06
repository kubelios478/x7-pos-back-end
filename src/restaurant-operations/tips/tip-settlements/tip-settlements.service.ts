import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { TipSettlement } from './entities/tip-settlement.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';
import { User } from '../../../platform-saas/users/entities/user.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { CreateTipSettlementDto } from './dto/create-tip-settlement.dto';
import { UpdateTipSettlementDto } from './dto/update-tip-settlement.dto';
import {
  GetTipSettlementQueryDto,
  TipSettlementSortBy,
} from './dto/get-tip-settlement-query.dto';
import {
  TipSettlementResponseDto,
  OneTipSettlementResponseDto,
  PaginatedTipSettlementResponseDto,
} from './dto/tip-settlement-response.dto';
import { QueryTipSettlementReportDto } from './dto/query-tip-settlement-report.dto';
import { SettlementMethod } from './constants/settlement-method.enum';
import { SettlementStatus } from './constants/settlement-status.enum';
import { LiquidatedTipSettlementsDto } from './dto/liquidated-tip-settlement.dto';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Tip } from '../tips/entities/tip.entity';
import { TipStatus } from '../tips/constants/tip-status.enum';
import { TipMethod } from '../tips/constants/tip-method.enum';
import { MerchantTipRule } from '../../../core/configuration/merchant-tip-rule/entity/merchant-tip-rule-entity';
import { TipDistributionMethod } from '../../../core/configuration/constants/tip-distribution-method.enum';
import { CashDrawer } from '../../cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { CashShift } from '../../cashdrawer/cash-shifts/entities/cash-shift.entity';
import { CashShiftStatus } from '../../cashdrawer/cash-shifts/constants/cash-shift-status.enum';
import { TipPayoutDto } from './dto/tip-payout.dto';
import { ShiftRole } from 'src/finance-hr/hr/collaborators/constants/shift-role.enum';
import { CashMovement } from '../../cashdrawer/cash-movements/entities/cash-movement.entity';
import { CashMovementType } from '../../cashdrawer/cash-movements/constants/cash-movement-type.enum';

@Injectable()
export class TipSettlementsService {
  constructor(
    @InjectRepository(TipSettlement)
    private readonly tipSettlementRepository: Repository<TipSettlement>,
    @InjectRepository(Collaborator)
    private readonly collaboratorRepository: Repository<Collaborator>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Tip)
    private readonly tipRepository: Repository<Tip>,
    @InjectRepository(MerchantTipRule)
    private readonly merchantTipRuleRepository: Repository<MerchantTipRule>,
    @InjectRepository(CashDrawer)
    private readonly cashDrawerRepo: Repository<CashDrawer>,
    @InjectRepository(CashShift)
    private readonly cashShiftRepo: Repository<CashShift>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createTipSettlementDto: CreateTipSettlementDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to create tip settlements',
      );
    }

    const merchant = await this.merchantRepository.findOne({
      where: { id: authenticatedUserMerchantId },
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const collaborator = await this.collaboratorRepository.findOne({
      where: {
        id: createTipSettlementDto.collaboratorId,
        merchant_id: authenticatedUserMerchantId,
      },
    });
    if (!collaborator) {
      throw new NotFoundException(
        'Collaborator not found or you do not have access to it',
      );
    }

    const shift = await this.shiftRepository.findOne({
      where: {
        id: createTipSettlementDto.shiftId,
        merchantId: authenticatedUserMerchantId,
      },
    });
    if (!shift) {
      throw new NotFoundException(
        'Shift not found or you do not have access to it',
      );
    }

    const settledByUser = await this.userRepository.findOne({
      where: { id: createTipSettlementDto.settledBy },
    });
    if (!settledByUser) {
      throw new NotFoundException('User (settled by) not found');
    }

    const settlement = new TipSettlement();
    settlement.company_id = merchant.companyId;
    settlement.merchant_id = authenticatedUserMerchantId;
    settlement.collaborator_id = createTipSettlementDto.collaboratorId;
    settlement.shift_id = createTipSettlementDto.shiftId;
    settlement.total_amount = createTipSettlementDto.totalAmount;
    settlement.settlement_method = createTipSettlementDto.settlementMethod;
    settlement.settled_by = createTipSettlementDto.settledBy;
    settlement.settled_at = new Date();

    const saved = await this.tipSettlementRepository.save(settlement);
    const complete = await this.tipSettlementRepository.findOne({
      where: { id: saved.id },
      relations: ['collaborator', 'shift', 'settledByUser'],
    });
    if (!complete) {
      throw new NotFoundException('Tip settlement not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Tip settlement created successfully',
      data: this.formatResponse(complete),
    };
  }

  async findAll(
    query: GetTipSettlementQueryDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<PaginatedTipSettlementResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access tip settlements',
      );
    }

    if (query.page !== undefined && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }
    if (query.limit !== undefined && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }
    if (query.settledDate && !/^\d{4}-\d{2}-\d{2}$/.test(query.settledDate)) {
      throw new BadRequestException(
        'Settled date must be in YYYY-MM-DD format',
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      });

    if (query.collaboratorId != null) {
      qb.andWhere('settlement.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaboratorId,
      });
    }
    if (query.shiftId != null) {
      qb.andWhere('settlement.shift_id = :shiftId', {
        shiftId: query.shiftId,
      });
    }
    if (query.settlementMethod != null) {
      qb.andWhere('settlement.settlement_method = :settlementMethod', {
        settlementMethod: query.settlementMethod,
      });
    }
    if (query.settledDate) {
      const startDate = new Date(query.settledDate);
      const endDate = new Date(query.settledDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('settlement.settled_at >= :settledStart', {
        settledStart: startDate,
      });
      qb.andWhere('settlement.settled_at < :settledEnd', {
        settledEnd: endDate,
      });
    }

    const sortField =
      query.sortBy === TipSettlementSortBy.TOTAL_AMOUNT
        ? 'settlement.total_amount'
        : query.sortBy === TipSettlementSortBy.SETTLEMENT_METHOD
          ? 'settlement.settlement_method'
          : query.sortBy === TipSettlementSortBy.SETTLED_AT
            ? 'settlement.settled_at'
            : query.sortBy === TipSettlementSortBy.CREATED_AT
              ? 'settlement.created_at'
              : 'settlement.id';
    qb.orderBy(sortField, query.sortOrder || 'DESC');
    qb.skip(skip).take(limit);

    const [settlements, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Tip settlements retrieved successfully',
      data: settlements.map((s) => this.formatResponse(s)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Tip settlement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access tip settlements',
      );
    }

    const settlement = await this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.id = :id', { id })
      .andWhere('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!settlement) {
      throw new NotFoundException('Tip settlement not found');
    }

    return {
      statusCode: 200,
      message: 'Tip settlement retrieved successfully',
      data: this.formatResponse(settlement),
    };
  }

  async update(
    id: number,
    updateTipSettlementDto: UpdateTipSettlementDto,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Tip settlement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to update tip settlements',
      );
    }

    const existing = await this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.id = :id', { id })
      .andWhere('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Tip settlement not found');
    }

    if (
      updateTipSettlementDto.totalAmount !== undefined &&
      updateTipSettlementDto.totalAmount < 0
    ) {
      throw new BadRequestException(
        'Total amount must be greater than or equal to 0',
      );
    }

    if (updateTipSettlementDto.collaboratorId !== undefined) {
      const collaborator = await this.collaboratorRepository.findOne({
        where: {
          id: updateTipSettlementDto.collaboratorId,
          merchant_id: authenticatedUserMerchantId,
        },
      });
      if (!collaborator) {
        throw new NotFoundException(
          'Collaborator not found or you do not have access to it',
        );
      }
    }
    if (updateTipSettlementDto.shiftId !== undefined) {
      const shift = await this.shiftRepository.findOne({
        where: {
          id: updateTipSettlementDto.shiftId,
          merchantId: authenticatedUserMerchantId,
        },
      });
      if (!shift) {
        throw new NotFoundException(
          'Shift not found or you do not have access to it',
        );
      }
    }
    if (updateTipSettlementDto.settledBy !== undefined) {
      const user = await this.userRepository.findOne({
        where: { id: updateTipSettlementDto.settledBy },
      });
      if (!user) {
        throw new NotFoundException('User (settled by) not found');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (updateTipSettlementDto.collaboratorId !== undefined)
      updateData.collaborator_id = updateTipSettlementDto.collaboratorId;
    if (updateTipSettlementDto.shiftId !== undefined)
      updateData.shift_id = updateTipSettlementDto.shiftId;
    if (updateTipSettlementDto.totalAmount !== undefined)
      updateData.total_amount = updateTipSettlementDto.totalAmount;
    if (updateTipSettlementDto.settlementMethod !== undefined)
      updateData.settlement_method = updateTipSettlementDto.settlementMethod;
    if (updateTipSettlementDto.settledBy !== undefined)
      updateData.settled_by = updateTipSettlementDto.settledBy;

    await this.tipSettlementRepository.update(id, updateData);

    const updated = await this.tipSettlementRepository.findOne({
      where: { id },
      relations: ['collaborator', 'shift', 'settledByUser'],
    });
    if (!updated) {
      throw new NotFoundException('Tip settlement not found after update');
    }

    return {
      statusCode: 200,
      message: 'Tip settlement updated successfully',
      data: this.formatResponse(updated),
    };
  }

  async remove(
    id: number,
    authenticatedUserMerchantId: number | null | undefined,
  ): Promise<OneTipSettlementResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException(
        'Tip settlement ID must be a valid positive number',
      );
    }
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to delete tip settlements',
      );
    }

    const existing = await this.tipSettlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.collaborator', 'collaborator')
      .leftJoinAndSelect('settlement.shift', 'shift')
      .leftJoinAndSelect('settlement.settledByUser', 'settledByUser')
      .where('settlement.id = :id', { id })
      .andWhere('settlement.merchant_id = :merchantId', {
        merchantId: authenticatedUserMerchantId,
      })
      .getOne();

    if (!existing) {
      throw new NotFoundException('Tip settlement not found');
    }

    await this.tipSettlementRepository.remove(existing);

    return {
      statusCode: 200,
      message: 'Tip settlement deleted successfully',
      data: this.formatResponse(existing),
    };
  }

  private formatResponse(settlement: TipSettlement): TipSettlementResponseDto {
    return {
      id: settlement.id,
      companyId: settlement.company_id,
      merchantId: settlement.merchant_id,
      collaboratorId: settlement.collaborator_id,
      collaborator: {
        id: settlement.collaborator.id,
        name: settlement.collaborator.name,
      },
      shiftId: settlement.shift_id,
      shift: {
        id: settlement.shift.id,
        startTime: settlement.shift.startTime,
      },
      totalAmount: Number(settlement.total_amount),
      settlementMethod: settlement.settlement_method,
      settledBy: settlement.settledByUser
        ? {
            id: settlement.settledByUser.id,
            name:
              settlement.settledByUser.username ||
              settlement.settledByUser.email ||
              '',
            email: settlement.settledByUser.email,
          }
        : null,
      settledAt: settlement.settled_at,
      createdAt: settlement.created_at,
    };
  }

  async getSettlementReport(query: QueryTipSettlementReportDto, user: User) {
    if (!user.merchant) {
      throw new ForbiddenException('Merchant not found');
    }
    const qb = this.tipSettlementRepository
      .createQueryBuilder('tipSettlement')
      .where('tipSettlement.merchant_id = :merchantId', {
        merchantId: user.merchant.id,
      });

    if (query.collaboratorId) {
      qb.andWhere('tipSettlement.collaborator_id = :collaboratorId', {
        collaboratorId: query.collaboratorId,
      });
    }

    if (query.shiftId) {
      qb.andWhere('tipSettlement.shift_id = :shiftId', {
        shiftId: query.shiftId,
      });
    }

    if (query.status) {
      qb.andWhere('tipSettlement.status = :status', {
        status: query.status,
      });
    }

    const settlements = await qb.getMany();

    const cashTips = settlements
      .filter((s) => s.settlement_method === SettlementMethod.CASH)
      .reduce((sum, s) => sum + Number(s.total_amount), 0);

    const cardTips = settlements
      .filter((s) => s.settlement_method === SettlementMethod.BANK_TRANSFER)
      .reduce((sum, s) => sum + Number(s.total_amount), 0);

    return {
      totalCashTips: cashTips,
      totalCardTips: cardTips,
      totalTips: cashTips + cardTips,
      settlements,
    };
  }

  async liquidatedTipSettlements(dto: LiquidatedTipSettlementsDto, user: User) {
    if (user.role !== UserRole.MERCHANT_ADMIN) {
      throw new ForbiddenException('Only merchant admins can settle tips');
    }

    const settlements = await this.tipSettlementRepository.find({
      where: {
        id: In(dto.settlementIds),
        merchant_id: user.merchant!.id,
      },
    });

    if (!settlements.length) {
      throw new NotFoundException('No settlements found');
    }

    for (const settlement of settlements) {
      settlement.status = SettlementStatus.LIQUIDATED;

      settlement.settled_at = new Date();

      settlement.settled_by = user.id;
    }

    await this.tipSettlementRepository.save(settlements);

    return {
      success: true,
      message: 'Tip settlements liquidated successfully',
      data: settlements,
    };
  }

  /**
   * Processes the payout of collected cash tips to staff at the end of the shift.
   * Updates tip status to PAID_OUT, records tip settlements, and deducts
   * the paid amount from the current_balance of the associated cash drawer.
   */
  async payoutTips(
    shiftId: number,
    dto: TipPayoutDto,
    userId: number,
    merchantId: number,
  ): Promise<{ statusCode: number; message: string; data: any }> {
    if (!merchantId) {
      throw new ForbiddenException('User must belong to a merchant');
    }
 
    const shift = await this.cashShiftRepo.findOne({
      where: { id: shiftId },
      relations: ['merchant'],
    });
 
    if (!shift) {
      throw new NotFoundException(`Cash shift with ID ${shiftId} not found`);
    }
 
    if (shift.merchantId !== merchantId) {
      throw new ForbiddenException('You can only perform tip payouts for shifts belonging to your merchant');
    }
 
    if (shift.status !== CashShiftStatus.OPEN) {
      throw new BadRequestException(
        `The cash register shift is ${shift.status.toLowerCase()}. Tips can only be paid out if there is a cash register shift in OPEN status.`,
      );
    }
 
    // 1. Fetch cash tips collected during the shift with COLLECTED status
    const tips = await this.tipRepository
      .createQueryBuilder('tip')
      .innerJoin('tip.order', 'order')
      .where('order.cash_shift_id = :shiftId', { shiftId })
      .andWhere('tip.method = :method', { method: TipMethod.CASH })
      .andWhere('tip.status = :status', { status: TipStatus.COLLECTED })
      .getMany();
 
    const totalTipsCollected = tips.reduce((sum, t) => sum + Number(t.amount), 0);
 
    // Calculate total amount to pay out from the DTO
    const totalPayout = dto.payments.reduce((sum, p) => sum + p.amount, 0);
 
    // AC 1: Validate that payout amount does not exceed collected cash tips
    if (totalPayout > totalTipsCollected) {
      throw new BadRequestException(
        `Cannot payout ${totalPayout} in tips. Only ${totalTipsCollected} was collected in cash during this shift.`,
      );
    }
 
    // Fetch collaborators to validate roles and identities
    const collaboratorIds = dto.payments.map((p) => p.collaboratorId);
    const collaborators = await this.collaboratorRepository.find({
      where: { id: In(collaboratorIds), merchant_id: merchantId },
    });
 
    if (collaborators.length !== collaboratorIds.length) {
      throw new NotFoundException('Some collaborators were not found or do not belong to your merchant');
    }
 
    // CAT 3: Validate distribution according to active TipRule
    const activeRule = await this.merchantTipRuleRepository.findOne({
      where: { merchant: { id: merchantId }, status: 'active' },
    });

    if (!activeRule) {
      throw new BadRequestException('No active tip distribution rule found for this merchant. Please configure a tip rule first.');
    }
 
    if (activeRule) {
      if (activeRule.tipDistributionMethod === TipDistributionMethod.ROLE_BASED) {
        const staffPercentage = Number(activeRule.staffPercentage || 0);
        const kitchenPercentage = Number(activeRule.kitchenPercentage || 0);
        const managerPercentage = Number(activeRule.managerPercentage || 0);
 
        const hasManagers = collaborators.some((c) => c.role === ShiftRole.MANAGER);
        const hasKitchen = collaborators.some((c) => c.role === ShiftRole.COOK);
        const hasStaff = collaborators.some((c) => c.role !== ShiftRole.MANAGER && c.role !== ShiftRole.COOK);
 
        const totalPresentPercentage =
          (hasManagers ? managerPercentage : 0) +
          (hasKitchen ? kitchenPercentage : 0) +
          (hasStaff ? staffPercentage : 0);
 
        if (totalPresentPercentage === 0) {
          throw new BadRequestException('Configured TipRule has 0% assigned to all selected collaborator categories.');
        }
 
        const adjustedManagerPct = hasManagers ? managerPercentage / totalPresentPercentage : 0;
        const adjustedKitchenPct = hasKitchen ? kitchenPercentage / totalPresentPercentage : 0;
        const adjustedStaffPct = hasStaff ? staffPercentage / totalPresentPercentage : 0;
 
        const expectedManagerTotal = totalPayout * adjustedManagerPct;
        const expectedKitchenTotal = totalPayout * adjustedKitchenPct;
        const expectedStaffTotal = totalPayout * adjustedStaffPct;
 
        const managerCount = collaborators.filter((c) => c.role === ShiftRole.MANAGER).length;
        const kitchenCount = collaborators.filter((c) => c.role === ShiftRole.COOK).length;
        const staffCount = collaborators.filter((c) => c.role !== ShiftRole.MANAGER && c.role !== ShiftRole.COOK).length;
 
        const expectedManagerAmount = managerCount > 0 ? expectedManagerTotal / managerCount : 0;
        const expectedKitchenAmount = kitchenCount > 0 ? expectedKitchenTotal / kitchenCount : 0;
        const expectedStaffAmount = staffCount > 0 ? expectedStaffTotal / staffCount : 0;
 
        for (const payment of dto.payments) {
          const collab = collaborators.find((c) => c.id === payment.collaboratorId)!;
          let expected = 0;
          if (collab.role === ShiftRole.MANAGER) {
            expected = expectedManagerAmount;
          } else if (collab.role === ShiftRole.COOK) {
            expected = expectedKitchenAmount;
          } else {
            expected = expectedStaffAmount;
          }
 
          if (Math.abs(payment.amount - expected) > 0.02) {
            throw new BadRequestException(
              `Tip payout of ${payment.amount} for collaborator ${collab.name} (${collab.role}) does not conform to the configured ROLE_BASED TipRule. Expected: ${expected.toFixed(2)}.`,
            );
          }
        }
      } else if (activeRule.tipDistributionMethod === TipDistributionMethod.POOL) {
        const expectedAmount = totalPayout / collaborators.length;
        for (const payment of dto.payments) {
          if (Math.abs(payment.amount - expectedAmount) > 0.02) {
            throw new BadRequestException(
              `Tip payout must be distributed equally under POOL rule. Expected: ${expectedAmount.toFixed(2)} per person.`,
            );
          }
        }
      }
    }
 
    // Start database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
 
    try {
      // Pessimistic write lock on cash shift
      const lockedShift = await queryRunner.manager.findOne(CashShift, {
        where: { id: shiftId, status: CashShiftStatus.OPEN },
        lock: { mode: 'pessimistic_write' },
      });
 
      if (!lockedShift) {
        throw new BadRequestException('The active cash shift has been closed or is unavailable.');
      }
 
      // Fetch and lock associated cash drawer
      const cashDrawer = await queryRunner.manager.findOne(CashDrawer, {
        where: { id: lockedShift.cashDrawerId },
        lock: { mode: 'pessimistic_write' },
      });
 
      if (!cashDrawer) {
        throw new NotFoundException(`Cash drawer associated with this shift not found`);
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

      // Validate that tip payout does not exceed physical cash available in the shift register
      if (totalPayout > liveBalance) {
        throw new BadRequestException(
          `Cannot payout ${totalPayout} in tips. The shift register only has ${liveBalance} available in cash.`,
        );
      }

      // Deduct the total payout from cash drawer current_balance
      const newDrawerBalance = Number(cashDrawer.current_balance) - Number(totalPayout);
      if (newDrawerBalance < 0) {
        throw new BadRequestException('Tip payout would result in a negative balance for the cash drawer.');
      }
      cashDrawer.current_balance = newDrawerBalance;
      await queryRunner.manager.save(CashDrawer, cashDrawer);
 
      // Update tips status to PAID_OUT
      const tipIds = tips.map((t) => t.id);
      if (tipIds.length > 0) {
        await queryRunner.manager.update(Tip, tipIds, { status: TipStatus.PAID_OUT });
      }
 
      // Record settlements in tip_settlements
      const companyId = shift.merchant.companyId;
      const personalShift = await queryRunner.manager.getRepository(Shift).findOne({
        where: { merchantId },
        order: { id: 'DESC' },
      });

      if (!personalShift) {
        throw new BadRequestException('No personal work shift found for this merchant. Create a work shift first.');
      }

      for (const payment of dto.payments) {
        const settlement = queryRunner.manager.getRepository(TipSettlement).create({
          company_id: companyId,
          merchant_id: merchantId,
          collaborator_id: payment.collaboratorId,
          shift_id: personalShift.id,
          total_amount: payment.amount,
          settlement_method: SettlementMethod.CASH,
          settled_by: userId,
          settled_at: new Date(),
          status: SettlementStatus.LIQUIDATED,
        });
        await queryRunner.manager.save(TipSettlement, settlement);
      }
 
      await queryRunner.commitTransaction();
 
      // Return the digital payment receipt (Ticket Payment Receipt - AC 2)
      return {
        statusCode: 201,
        message: 'Tips paid out successfully',
        data: {
          receiptId: `REC-TIP-${shiftId}-${Date.now()}`,
          shiftId,
          totalPaid: totalPayout,
          paymentDate: new Date(),
          settledBy: userId,
          details: dto.payments.map((p) => {
            const collab = collaborators.find((c) => c.id === p.collaboratorId)!;
            return {
              collaboratorId: p.collaboratorId,
              collaboratorName: collab.name,
              role: collab.role,
              amount: p.amount,
            };
          }),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCollectedTipsSummary(
    shiftId: number,
    merchantId: number,
  ): Promise<{ shiftId: number; totalTipsCollected: number; tipsCount: number }> {
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
      throw new ForbiddenException('You can only view tips for shifts belonging to your merchant');
    }

    const tips = await this.tipRepository
      .createQueryBuilder('tip')
      .innerJoin('tip.order', 'order')
      .where('order.cash_shift_id = :shiftId', { shiftId })
      .andWhere('tip.method = :method', { method: TipMethod.CASH })
      .andWhere('tip.status = :status', { status: TipStatus.COLLECTED })
      .getMany();

    const totalTipsCollected = tips.reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      shiftId,
      totalTipsCollected,
      tipsCount: tips.length,
    };
  }
}
