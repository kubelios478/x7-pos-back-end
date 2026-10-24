import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CompanySubscription } from './company-subscriptions/entities/company-subscription.entity';
import { SubscriptionPayment } from './subscription-payments/entity/subscription-payments.entity';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  const companySubscriptionRepo = { findOne: jest.fn() };
  const subscriptionPaymentRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const plan = {
    id: 3,
    name: 'Pro',
    slug: 'pro',
    price: '49.90',
    billingCycle: 'monthly',
  };
  const subscriptionEnding = (endDate: string | null, status = 'active') =>
    ({
      id: 12,
      status,
      startDate: '2026-01-15',
      endDate,
      renewalDate: endDate,
      paymentMethod: 'card',
      plan,
    }) as unknown as CompanySubscription;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(CompanySubscription),
          useValue: companySubscriptionRepo,
        },
        {
          provide: getRepositoryToken(SubscriptionPayment),
          useValue: subscriptionPaymentRepo,
        },
      ],
    }).compile();
    service = module.get(SubscriptionsService);
  });

  afterEach(() => jest.useRealTimers());

  describe('getMySubscription', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-24T15:00:00Z'));
    });

    it('returns the latest subscription of the company with its plan', async () => {
      companySubscriptionRepo.findOne.mockResolvedValue(
        subscriptionEnding('2026-11-15'),
      );
      subscriptionPaymentRepo.findOne.mockResolvedValue(null);

      const result = await service.getMySubscription(5);

      expect(companySubscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { company: { id: 5 } },
        order: { startDate: 'DESC', id: 'DESC' },
      });
      expect(result.data).toEqual({
        subscription: {
          id: 12,
          status: 'active',
          isActive: true,
          startDate: '2026-01-15',
          endDate: '2026-11-15',
          renewalDate: '2026-11-15',
          paymentMethod: 'card',
          plan: {
            id: 3,
            name: 'Pro',
            slug: 'pro',
            price: 49.9,
            billingCycle: 'monthly',
          },
        },
        pendingPayment: null,
      });
    });

    it.each([
      ['ends today', '2026-10-24', 'active', true],
      ['has no end date', null, 'active', true],
      ['ended yesterday', '2026-10-23', 'active', false],
      ['is not active', '2026-11-15', 'inactive', false],
    ])(
      'isActive when the subscription %s',
      async (_label, endDate, status, expected) => {
        companySubscriptionRepo.findOne.mockResolvedValue(
          subscriptionEnding(endDate, status),
        );
        subscriptionPaymentRepo.findOne.mockResolvedValue(null);

        const result = await service.getMySubscription(5);

        expect(result.data.subscription?.isActive).toBe(expected);
      },
    );

    it('returns null when the company never had a subscription, plus the pending intent', async () => {
      companySubscriptionRepo.findOne.mockResolvedValue(null);
      subscriptionPaymentRepo.findOne.mockResolvedValue({
        id: '41',
        plan_id: '3',
        plan,
        amount: '49.90',
        currency: 'USD',
        status: 'pending',
        paymentMethod: 'dummy_gateway',
        paymentDate: new Date('2026-10-24T14:00:00Z'),
        raw_payload: { intent: true },
      });

      const result = await service.getMySubscription(5);

      expect(subscriptionPaymentRepo.findOne).toHaveBeenCalledWith({
        where: { company_id: 5, status: 'pending' },
        order: { paymentDate: 'DESC', id: 'DESC' },
      });
      expect(result.data).toEqual({
        subscription: null,
        pendingPayment: {
          id: 41,
          planId: 3,
          planName: 'Pro',
          amount: 49.9,
          currency: 'USD',
          status: 'pending',
          paymentMethod: 'dummy_gateway',
          paymentDate: new Date('2026-10-24T14:00:00Z'),
        },
      });
    });
  });

  describe('getMyPayments', () => {
    it('pages only the payments of the company, newest first', async () => {
      subscriptionPaymentRepo.findAndCount.mockResolvedValue([[], 21]);

      const result = await service.getMyPayments(5, { page: 3, limit: 10 });

      expect(subscriptionPaymentRepo.findAndCount).toHaveBeenCalledWith({
        where: { company_id: 5 },
        order: { paymentDate: 'DESC', id: 'DESC' },
        skip: 20,
        take: 10,
      });
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 21,
        totalPages: 3,
      });
    });
  });
});
