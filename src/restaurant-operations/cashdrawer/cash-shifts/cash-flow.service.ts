import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CashTransaction } from '../cash-transactions/entities/cash-transaction.entity';
import { CashTransactionType } from '../cash-transactions/constants/cash-transaction-type.enum';
import { CashTransactionStatus } from '../cash-transactions/constants/cash-transaction-status.enum';
import { CashShiftMovementType } from './constants/cash-shift-movement-type.enum';

/**
 * CashFlowService — Single point of entry to add or remove money from a shift.
 *
 * Every financial movement (sale, withdrawal, refund, tip, adjustment) must
 * pass through this service. It always receives an external EntityManager to be able
 * to participate in transactions with QueryRunner.
 */
@Injectable()
export class CashFlowService {
    /**
     * Registers a movement in the cash_transactions table linked to a shiftId.
     *
     * @param shiftId       ID of the active cash shift.
     * @param amount        Amount of the movement (always positive).
     * @param movementType  'IN' = income, 'OUT' = outflow.
     * @param orderId       ID of the order (optional, null if it is a manual movement).
     * @param collaboratorId ID of the collaborator making the movement.
     * @param cashDrawerId   ID of the physical cash drawer to which the transaction belongs.
     * @param manager       EntityManager of the active QueryRunner.
     */
    async addMovement(
        shiftId: number,
        amount: number,
        movementType: CashShiftMovementType,
        orderId: number | null,
        collaboratorId: number,
        cashDrawerId: number,
        manager: EntityManager,
    ): Promise<CashTransaction> {
        const transactionType =
            movementType === CashShiftMovementType.IN
                ? CashTransactionType.SALE
                : CashTransactionType.WITHDRAWAL;

        const transaction = manager.getRepository(CashTransaction).create({
            shift_id: shiftId,
            cash_drawer_id: cashDrawerId,
            order_id: orderId,
            type: transactionType,
            amount,
            collaborator_id: collaboratorId,
            status: CashTransactionStatus.ACTIVE,
            notes: null,
        });

        return manager.getRepository(CashTransaction).save(transaction);
    }
}
