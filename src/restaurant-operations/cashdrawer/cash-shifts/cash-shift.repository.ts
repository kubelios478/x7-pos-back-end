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

    /**
     * Calculates the sales summary by payment method for a given shift.
     * Groups by payment method (cash, card, qr, online, etc.) and sums up the net payments (refunds subtract).
     */
    async getSalesSummary(shiftId: number): Promise<{ method: string; amount: number }[]> {
        const results = await this.dataSource
            .getRepository(CashShift)
            .createQueryBuilder('cs')
            .innerJoin('orders', 'o', 'o.shift_id = cs.id')
            .innerJoin('order_payments', 'op', 'op.order_id = o.id')
            .select('op.method', 'method')
            .addSelect(
                `SUM(
                    CASE 
                        WHEN op.is_refund = true THEN -(COALESCE(op.amount, 0) + COALESCE(op.tip_amount, 0))
                        ELSE (COALESCE(op.amount, 0) + COALESCE(op.tip_amount, 0))
                    END
                )`,
                'amount',
            )
            .where('cs.id = :shiftId', { shiftId })
            .groupBy('op.method')
            .getRawMany<{ method: string; amount: string }>();

        return results.map((r) => ({
            method: r.method,
            amount: Number(r.amount ?? 0),
        }));
    }
}
