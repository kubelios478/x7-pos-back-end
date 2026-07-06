import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { OnboardingService } from './onboarding.service';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { UsersService } from '../platform-saas/users/users.service';
import { SubscriptionAccessService } from '../auth/subscription-access.service';

const mockPlans: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Essential',
    slug: 'essential',
    badge: 'Quick Service',
    description: 'Essential plan',
    price: 69,
    billingCycle: 'monthly',
    status: 'active',
    recommended: false,
    isCustomPricing: false,
    displayFeatures: [
      { id: 1, subscriptionPlanId: 1, label: 'Up to 2 Standard Terminals', sortOrder: 1 },
    ],
  } as SubscriptionPlan,
  {
    id: 2,
    name: 'Professional',
    slug: 'professional',
    badge: 'Full Restaurant',
    description: 'Professional plan',
    price: 149,
    billingCycle: 'monthly',
    status: 'active',
    recommended: true,
    isCustomPricing: false,
    displayFeatures: [],
  } as SubscriptionPlan,
  {
    id: 3,
    name: 'Executive',
    slug: 'executive',
    badge: 'Enterprise',
    description: 'Executive plan',
    price: null,
    billingCycle: 'annual',
    status: 'active',
    recommended: false,
    isCustomPricing: true,
    priceLabel: 'ANNUAL BILLING',
    displayFeatures: [],
  } as SubscriptionPlan,
];

describe('OnboardingService', () => {
  let service: OnboardingService;
  const planRepo = {
    find: jest.fn().mockResolvedValue(mockPlans),
    findOne: jest.fn(),
    exists: jest.fn(),
  };

  const sessionRepo = {
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: DataSource, useValue: { createQueryRunner: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: UsersService, useValue: { updateRefreshToken: jest.fn() } },
        {
          provide: SubscriptionAccessService,
          useValue: { getSubscriptionAccessForCompany: jest.fn() },
        },
        { provide: getRepositoryToken(OnboardingSession), useValue: sessionRepo },
        { provide: getRepositoryToken(User), useValue: { exists: jest.fn() } },
        {
          provide: getRepositoryToken(Company),
          useValue: { exists: jest.fn() },
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: { exists: jest.fn(), findOne: jest.fn() },
        },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
      ],
    }).compile();

    service = module.get(OnboardingService);
    jest.clearAllMocks();
    planRepo.find.mockResolvedValue(mockPlans);
  });

  it('returns subscription tiers from database plans', async () => {
    const tiers = await service.getSubscriptionTiers();
    expect(tiers).toHaveLength(3);
    expect(tiers[0].price).toBe('$69 / MONTH');
    expect(tiers[1].recommended).toBe(true);
    expect(tiers[2].isCustom).toBe(true);
    expect(tiers[2].price).toBe('Custom');
    expect(tiers[0].features[0]).toBe('Up to 2 Standard Terminals');
  });

  it('rejects executive tier during select-subscription', async () => {
    planRepo.findOne.mockResolvedValue(mockPlans[2]);
    await expect(service.selectSubscription('executive')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
