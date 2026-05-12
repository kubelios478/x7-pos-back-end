import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { CashShift } from './entities/cash-shift.entity';

@Injectable()
export class CashShiftRepository extends Repository<CashShift> {
    constructor(@InjectDataSource() private readonly dataSource: DataSource) {
        super(CashShift, dataSource.createEntityManager());
    }

    /**
     * TAC 1: Calculates the live balance of the cash shift using a single
     * SQL query with SUM. Bringing records into code to sum them is prohibited.
     *
     * Formula: opening_balance + SUM(sales + incomes) - SUM(outflows)
     */
    async getLiveBalance(shiftId: number): Promise<number> {
        const result = await this.dataSource
            .getRepository(CashShift)
            .createQueryBuilder('cs')
            .leftJoin(
                'cash_transactions',
                'ct',
                'ct.shift_id = cs.id AND ct.status = :active',
                { active: 'active' },
            )
            .select(
                `(
          COALESCE(cs.opening_balance, 0)
          + COALESCE(SUM(CASE WHEN ct.type IN ('sale', 'adjustment_up') THEN ct.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN ct.type IN ('refund', 'withdrawal', 'adjustment_down') THEN ct.amount ELSE 0 END), 0)
        )`,
                'liveBalance',
            )
            .where('cs.id = :shiftId', { shiftId })
            .groupBy('cs.id')
            .addGroupBy('cs.opening_balance')
            .getRawOne<{ liveBalance: string }>();

        return Number(result?.liveBalance ?? 0);
    }
}
