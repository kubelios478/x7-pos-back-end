import {
    Injectable,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CashShift } from './entities/cash-shift.entity';
import { CashShiftStatus } from './constants/cash-shift-status.enum';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { CashDrawerStatus } from '../cash-drawers/constants/cash-drawer-status.enum';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CashShiftRepository } from './cash-shift.repository';
import { CreateCashShiftDto } from './dto/create-cash-shift.dto';
import { CloseCashShiftDto } from './dto/close-cash-shift.dto';
import { ManualCashTransactionDto } from './dto/manual-cash-transaction.dto';
import { CashShiftMovementType } from './constants/cash-shift-movement-type.enum';
import { CashFlowService } from './cash-flow.service';
import {
    CashShiftResponseDto,
    OneCashShiftResponseDto,
    AllCashShiftsResponseDto,
} from './dto/cash-shift-response.dto';

@Injectable()
export class CashShiftsService {
    constructor(
        @InjectRepository(CashDrawer)
        private readonly cashDrawerRepo: Repository<CashDrawer>,
        @InjectRepository(Merchant)
        private readonly merchantRepo: Repository<Merchant>,
        @InjectRepository(Collaborator)
        private readonly collaboratorRepo: Repository<Collaborator>,
        private readonly cashShiftRepo: CashShiftRepository,
        private readonly dataSource: DataSource,
        private readonly cashFlowService: CashFlowService,
    ) { }

    // ── Private helpers ─────────────────────────────────────────────────────────

    private format(shift: CashShift): CashShiftResponseDto {
        return {
            id: shift.id,
            merchantId: shift.merchantId,
            cashDrawerId: shift.cashDrawerId,
            openedBy: shift.openedBy,
            closedBy: shift.closedBy,
            openingBalance: Number(shift.openingBalance),
            systemAmount: shift.systemAmount !== null ? Number(shift.systemAmount) : null,
            declaredAmount: shift.declaredAmount !== null ? Number(shift.declaredAmount) : null,
            difference: shift.difference !== null ? Number(shift.difference) : null,
            status: shift.status,
            openedAt: shift.openedAt,
            closedAt: shift.closedAt,
        };
    }

    // ── Operaciones ──────────────────────────────────────────────────────────────

    /**
     * Opens a new cash shift for the merchant.
     * Rules:
     *  - The merchant cannot have another OPEN shift at the same time.
     *  - The cash drawer must be OPEN and belong to the merchant.
     */
    async openShift(
        dto: CreateCashShiftDto,
        merchantId: number,
    ): Promise<OneCashShiftResponseDto> {
        if (!merchantId) {
            throw new ForbiddenException('User must belong to a merchant');
        }

        // Validate that the merchant does not already have an active shift
        const existing = await this.cashShiftRepo.findOne({
            where: { merchantId, status: CashShiftStatus.OPEN },
        });
        if (existing) {
            throw new ConflictException(
                `An open cash shift (ID: ${existing.id}) already exists for this merchant. Close it before opening a new one.`,
            );
        }

        // Validate cash drawer
        const cashDrawer = await this.cashDrawerRepo.findOne({
            where: { id: dto.cashDrawerId },
        });
        if (!cashDrawer) {
            throw new NotFoundException(`Cash drawer with ID ${dto.cashDrawerId} not found`);
        }
        if (cashDrawer.merchant_id !== merchantId) {
            throw new ForbiddenException('The cash drawer does not belong to your merchant');
        }
        if (cashDrawer.status !== CashDrawerStatus.OPEN) {
            throw new BadRequestException(
                'The cash drawer must be in OPEN status to open a cash shift',
            );
        }

        // Validate collaborator
        const collaborator = await this.collaboratorRepo.findOne({
            where: { id: dto.collaboratorId, merchant_id: merchantId },
        });
        if (!collaborator) {
            throw new NotFoundException(`Collaborator with ID ${dto.collaboratorId} not found or does not belong to your merchant`);
        }

        const shift = this.cashShiftRepo.create({
            merchantId,
            cashDrawerId: dto.cashDrawerId,
            openedBy: dto.collaboratorId,
            closedBy: null,
            openingBalance: dto.openingBalance,
            systemAmount: null,
            declaredAmount: null,
            difference: null,
            status: CashShiftStatus.OPEN,
            closedAt: null,
        });

        const saved = await this.cashShiftRepo.save(shift);

        return {
            statusCode: 201,
            message: 'Cash shift opened successfully',
            data: this.format(saved),
        };
    }

    /**
     * Cash shift closing process (Process Flow from TAC):
     *
     * 1. Gets the shift (validates OPEN + merchant ownership).
     * 2. Calls getLiveBalance() -> DB engine calculates systemAmount.
     * 3. Calculates difference = declaredAmount - systemAmount.
     * 4. Updates the shift with all closing fields.
     * 5. Returns the processed closing object.
     */
    async closeShift(
        shiftId: number,
        dto: CloseCashShiftDto,
        merchantId: number,
    ): Promise<OneCashShiftResponseDto> {
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
            throw new ForbiddenException('You can only close cash shifts belonging to your merchant');
        }

        if (shift.status !== CashShiftStatus.OPEN) {
            throw new BadRequestException(
                `The cash shift is already ${shift.status.toLowerCase()}. Only OPEN cash shifts can be closed.`,
            );
        }

        // Validate collaborator closing the shift
        const collaborator = await this.collaboratorRepo.findOne({
            where: { id: dto.collaboratorId, merchant_id: merchantId },
        });
        if (!collaborator) {
            throw new NotFoundException(`Collaborator with ID ${dto.collaboratorId} not found or does not belong to your merchant`);
        }

        // Step 1: obtain systemAmount from the DB (delegated 100% to SQL engine)
        const systemAmount = await this.cashShiftRepo.getLiveBalance(shiftId);

        // Step 2: calculate difference on the server
        const declaredAmount = Number(dto.declaredAmount);
        const difference = declaredAmount - systemAmount;

        // Step 3 & 4: update the record with closing data
        shift.systemAmount = systemAmount;
        shift.declaredAmount = declaredAmount;
        shift.difference = difference;
        shift.closedBy = dto.collaboratorId;
        shift.closedAt = new Date();
        shift.status = CashShiftStatus.CLOSED;

        const closed = await this.cashShiftRepo.save(shift);

        return {
            statusCode: 200,
            message: 'Cash shift closed successfully',
            data: this.format(closed),
        };
    }

    /**
     * Registers a manual transaction (Income/Expense) to the active shift.
     * Implementing CAT 1: OUT flows cannot exceed live balance.
     * CAT 2: Records collaboratorId.
     * CAT 3: Handled by movement type OUT/IN, decoupled from SALES.
     */
    async addManualTransaction(
        shiftId: number,
        dto: ManualCashTransactionDto,
        merchantId: number,
    ) {
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
            throw new ForbiddenException('You can only modify cash shifts belonging to your merchant');
        }

        if (shift.status !== CashShiftStatus.OPEN) {
            throw new BadRequestException(
                `The cash shift is ${shift.status.toLowerCase()}. You can only add transactions to an OPEN shift.`,
            );
        }

        // Validate collaborator
        const collaborator = await this.collaboratorRepo.findOne({
            where: { id: dto.collaboratorId, merchant_id: merchantId },
        });
        if (!collaborator) {
            throw new NotFoundException(`Collaborator with ID ${dto.collaboratorId} not found or does not belong to your merchant`);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Re-fetch shift with lock to prevent race conditions during OUT flows (Double Spend prevention)
            const lockedShift = await queryRunner.manager.findOne(CashShift, {
                where: { id: shiftId, status: CashShiftStatus.OPEN },
                lock: { mode: 'pessimistic_write' },
            });

            if (!lockedShift) {
                throw new BadRequestException('The active cash shift has been closed or is unavailable.');
            }

            // CAT 1: Ensure OUT flows do not exceed current live balance
            if (dto.type === CashShiftMovementType.OUT) {
                // In a transaction, getLiveBalance should ideally be executed with the manager to use the locked data
                const result = await queryRunner.manager.query(
                    `
          SELECT 
            (opening_balance +
             COALESCE(SUM(CASE WHEN t.type = 'sale' THEN t.amount + COALESCE(t.tip_amount, 0) ELSE 0 END), 0) +
             COALESCE(SUM(CASE WHEN t.type = 'adjustment_up' THEN t.amount ELSE 0 END), 0)
            ) -
            COALESCE(SUM(CASE WHEN t.type IN ('refund', 'withdrawal', 'adjustment_down') THEN t.amount + COALESCE(t.tip_amount, 0) ELSE 0 END), 0) AS balance
          FROM cash_shifts s
          LEFT JOIN cash_transactions t ON t.shift_id = s.id AND t.status = 'active'
          WHERE s.id = $1
          GROUP BY s.id, s.opening_balance
          `,
                    [lockedShift.id],
                );
                const liveBalance = result.length > 0 ? Number(result[0].balance) : Number(lockedShift.openingBalance);

                if (dto.amount > liveBalance) {
                    throw new BadRequestException(`Cannot process OUT flow of ${dto.amount}. The till only has ${liveBalance} available.`);
                }
            }

            const transaction = await this.cashFlowService.addMovement(
                lockedShift.id,
                dto.amount,
                dto.type,
                null,
                dto.collaboratorId,
                lockedShift.cashDrawerId,
                queryRunner.manager,
                dto.reason,
            );

            await queryRunner.commitTransaction();

            return {
                statusCode: 201,
                message: 'Manual transaction registered successfully',
                data: transaction,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /** Finds the active (OPEN) cash shift for the merchant. */
    async findActiveShift(merchantId: number): Promise<OneCashShiftResponseDto> {
        if (!merchantId) {
            throw new ForbiddenException('User must belong to a merchant');
        }

        const shift = await this.cashShiftRepo.findOne({
            where: { merchantId, status: CashShiftStatus.OPEN },
        });

        if (!shift) {
            throw new NotFoundException('No active cash shift found for this merchant');
        }

        return {
            statusCode: 200,
            message: 'Active cash shift found',
            data: this.format(shift),
        };
    }

    /** Lists all cash shifts for the merchant. */
    async findAll(merchantId: number): Promise<AllCashShiftsResponseDto> {
        if (!merchantId) {
            throw new ForbiddenException('User must belong to a merchant');
        }

        const shifts = await this.cashShiftRepo.find({
            where: { merchantId },
            order: { openedAt: 'DESC' },
        });

        return {
            statusCode: 200,
            message: 'Cash shifts retrieved successfully',
            data: shifts.map((s) => this.format(s)),
        };
    }

    /** Gets a cash shift by ID. */
    async findOne(id: number, merchantId: number): Promise<OneCashShiftResponseDto> {
        if (!merchantId) {
            throw new ForbiddenException('User must belong to a merchant');
        }

        const shift = await this.cashShiftRepo.findOne({ where: { id } });

        if (!shift) {
            throw new NotFoundException(`Cash shift with ID ${id} not found`);
        }

        if (shift.merchantId !== merchantId) {
            throw new ForbiddenException('You can only view cash shifts belonging to your merchant');
        }

        return {
            statusCode: 200,
            message: 'Cash shift retrieved successfully',
            data: this.format(shift),
        };
    }
}
