import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { LoyaltyAnalyticsService } from './loyalty-analytics.service';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyPointTransaction } from '../loyalty-points-transaction/entities/loyalty-points-transaction.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';

describe('LoyaltyAnalyticsService', () => {
  let service: LoyaltyAnalyticsService;

  const mockMonthlyQb = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([
      { month: '2026-01', points_issued: '1000', points_redeemed: '200' },
      { month: '2026-02', points_issued: '2000', points_redeemed: '500' },
    ]),
  };

  const mockOutstandingQb = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ sum: '3300' }),
  };

  const mockTransactionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockMonthlyQb),
  };

  const mockCustomerRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockOutstandingQb),
  };

  const mockDataSource = {
    manager: {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        merchantId: 10,
        redeem_points_per_currency: 100,
        is_active: true,
      } as LoyaltyProgram),
      getRepository: jest.fn((entity: unknown) => {
        if (entity === LoyaltyPointTransaction) {
          return mockTransactionRepo;
        }
        if (entity === LoyaltyCustomer) {
          return mockCustomerRepo;
        }
        return mockCustomerRepo;
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyAnalyticsService,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get(LoyaltyAnalyticsService);
  });

  it('returns server-calculated KPI, monthly trends, and liability', async () => {
    const result = await service.getReport(
      { fromDate: '2026-01-01', toDate: '2026-02-28' },
      10,
    );

    expect(result.data.totalPointsIssued).toBe(3000);
    expect(result.data.totalPointsRedeemed).toBe(700);
    expect(result.data.redemptionRatePercent).toBeCloseTo(23.33, 1);
    expect(result.data.monthlyTrends).toHaveLength(2);
    expect(result.data.outstandingPointsBalance).toBe(3300);
    expect(result.data.outstandingLiabilityAmount).toBe(33);
    expect(result.data.redeemPointsPerCurrency).toBe(100);
  });

  it('applies VIP filter when minLifetimePoints is provided', async () => {
    await service.getReport(
      {
        fromDate: '2026-01-01',
        toDate: '2026-02-28',
        minLifetimePoints: 5000,
      },
      10,
    );

    expect(mockMonthlyQb.andWhere).toHaveBeenCalledWith(
      'lc.lifetimePoints >= :vip',
      { vip: 5000 },
    );
    expect(mockOutstandingQb.andWhere).toHaveBeenCalledWith(
      'lc.lifetimePoints >= :vip',
      { vip: 5000 },
    );
  });
});
