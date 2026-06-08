import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GetLoyaltyAnalyticsQueryDto } from './dto/get-loyalty-analytics-query.dto';
import {
  LoyaltyAnalyticsReportDto,
  LoyaltyMonthlyTrendDto,
  OneLoyaltyAnalyticsResponseDto,
} from './dto/loyalty-analytics-response.dto';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyPointsSource } from '../loyalty-points-transaction/constants/loyalty-points-source.enum';
import {
  computeLiabilityAmount,
  computeRedemptionRatePercent,
} from '../utils/loyalty-analytics.util';

type MonthlyRawRow = {
  month: string;
  points_issued: string;
  points_redeemed: string;
};

@Injectable()
export class LoyaltyAnalyticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getReport(
    query: GetLoyaltyAnalyticsQueryDto,
    authenticatedUserMerchantId: number,
  ): Promise<OneLoyaltyAnalyticsResponseDto> {
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException(
        'You must be associated with a merchant to access loyalty analytics',
      );
    }

    const from = this.parseInclusiveStart(query.fromDate);
    const to = this.parseInclusiveEnd(query.toDate);
    if (from > to) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }

    const program = await this.dataSource.manager.findOne(LoyaltyProgram, {
      where: { merchantId: authenticatedUserMerchantId, is_active: true },
      order: { created_at: 'ASC' },
    });
    if (!program) {
      throw new NotFoundException('Active loyalty program not found');
    }

    const redeemRate = Number(program.redeem_points_per_currency ?? 0);

    const monthlyTrends = await this.queryMonthlyTrends(
      authenticatedUserMerchantId,
      from,
      to,
      query.minLifetimePoints,
    );

    const totalPointsIssued = monthlyTrends.reduce(
      (sum, m) => sum + m.pointsIssued,
      0,
    );
    const totalPointsRedeemed = monthlyTrends.reduce(
      (sum, m) => sum + m.pointsRedeemed,
      0,
    );

    const outstandingPointsBalance = await this.queryOutstandingPoints(
      authenticatedUserMerchantId,
      query.minLifetimePoints,
    );

    const data: LoyaltyAnalyticsReportDto = {
      fromDate: query.fromDate,
      toDate: query.toDate,
      minLifetimePoints: query.minLifetimePoints ?? null,
      totalPointsIssued,
      totalPointsRedeemed,
      redemptionRatePercent: computeRedemptionRatePercent(
        totalPointsIssued,
        totalPointsRedeemed,
      ),
      monthlyTrends,
      outstandingPointsBalance,
      outstandingLiabilityAmount: computeLiabilityAmount(
        outstandingPointsBalance,
        redeemRate,
      ),
      redeemPointsPerCurrency: redeemRate,
    };

    return {
      statusCode: 200,
      message: 'Loyalty analytics report generated successfully',
      data,
    };
  }

  private async queryMonthlyTrends(
    merchantId: number,
    from: Date,
    to: Date,
    minLifetimePoints?: number,
  ): Promise<LoyaltyMonthlyTrendDto[]> {
    const qb = this.dataSource.manager
      .getRepository(LoyaltyPointTransaction)
      .createQueryBuilder('t')
      .innerJoin('t.loyaltyCustomer', 'lc')
      .innerJoin('lc.loyaltyProgram', 'lp')
      .select("TO_CHAR(t.createdAt, 'YYYY-MM')", 'month')
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.points > 0 AND t.source != :reversal THEN t.points ELSE 0 END), 0)`,
        'points_issued',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN t.source = :redemption THEN ABS(t.points) ELSE 0 END), 0)`,
        'points_redeemed',
      )
      .where('lp.merchantId = :merchantId', { merchantId })
      .andWhere('t.is_active = true')
      .andWhere('t.createdAt BETWEEN :from AND :to', { from, to })
      .setParameter('reversal', LoyaltyPointsSource.ORDER_REVERSAL)
      .setParameter('redemption', LoyaltyPointsSource.REDEMPTION)
      .groupBy("TO_CHAR(t.createdAt, 'YYYY-MM')")
      .orderBy('month', 'ASC');

    if (minLifetimePoints != null && minLifetimePoints > 0) {
      qb.andWhere('lc.lifetimePoints >= :vip', { vip: minLifetimePoints });
    }

    const rows = await qb.getRawMany<MonthlyRawRow>();

    return rows.map((row) => {
      const pointsIssued = parseInt(row.points_issued, 10) || 0;
      const pointsRedeemed = parseInt(row.points_redeemed, 10) || 0;
      return {
        month: row.month,
        pointsIssued,
        pointsRedeemed,
        redemptionRatePercent: computeRedemptionRatePercent(
          pointsIssued,
          pointsRedeemed,
        ),
      };
    });
  }

  private async queryOutstandingPoints(
    merchantId: number,
    minLifetimePoints?: number,
  ): Promise<number> {
    const qb = this.dataSource.manager
      .getRepository(LoyaltyCustomer)
      .createQueryBuilder('lc')
      .innerJoin('lc.loyaltyProgram', 'lp')
      .select('COALESCE(SUM(lc.currentPoints), 0)', 'sum')
      .where('lp.merchantId = :merchantId', { merchantId })
      .andWhere('lc.is_active = true');

    if (minLifetimePoints != null && minLifetimePoints > 0) {
      qb.andWhere('lc.lifetimePoints >= :vip', { vip: minLifetimePoints });
    }

    const raw = await qb.getRawOne<{ sum: string }>();
    const sum = raw?.sum ? parseInt(raw.sum, 10) : 0;
    return Number.isFinite(sum) ? sum : 0;
  }

  private parseInclusiveStart(dateStr: string): Date {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid fromDate');
    }
    return d;
  }

  private parseInclusiveEnd(dateStr: string): Date {
    const d = new Date(`${dateStr}T23:59:59.999Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid toDate');
    }
    return d;
  }
}
