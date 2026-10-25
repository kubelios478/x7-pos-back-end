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
      {
        id: 1,
        subscriptionPlanId: 1,
        label: 'Up to 2 Standard Terminals',
        sortOrder: 1,
      },
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
    create: jest.fn((payload: unknown) => payload as OnboardingSession),
    save: jest.fn((payload: unknown) =>
      Promise.resolve(payload as OnboardingSession),
    ),
    findOne: jest.fn(),
  };

  const userRepo = { exists: jest.fn(), find: jest.fn() };
  const dataSource = { createQueryRunner: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: DataSource, useValue: dataSource },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: UsersService, useValue: { updateRefreshToken: jest.fn() } },
        {
          provide: SubscriptionAccessService,
          useValue: { getSubscriptionAccessForCompany: jest.fn() },
        },
        {
          provide: getRepositoryToken(OnboardingSession),
          useValue: sessionRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(Company),
          useValue: { exists: jest.fn().mockResolvedValue(false) },
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

  // El wizard tomaba la parte local del email sin mirar si ya existía y creaba el duplicado.
  it('provisions the admin with a free username derived from the email', async () => {
    sessionRepo.findOne.mockResolvedValue({
      id: 's-1',
      completed: false,
      expiresAt: new Date(Date.now() + 60_000),
      legalBusinessName: 'Acme LLC',
      taxId: '12-3456789',
      registeredAddress: '1 Main St',
      city: 'Miami',
      state: 'Florida',
      zipCode: '33101',
      merchantName: 'Acme Downtown',
      merchantEmail: 'contact@acme.com',
      merchantAddress: '1 Main St',
      merchantCity: 'Miami',
      merchantState: 'Florida',
      merchantCountry: 'USA',
      planId: 2,
    } as unknown as OnboardingSession);
    userRepo.exists.mockResolvedValue(false);
    userRepo.find.mockResolvedValue([{ username: 'admin' }]);
    // Se corta al guardar el usuario: sólo interesa el username con que se crea.
    const stop = new Error('stop after the user');
    const manager = {
      create: jest.fn((_entity: unknown, data: object) => ({ ...data })),
      save: jest.fn((entity: unknown, data: object) =>
        entity === User
          ? Promise.reject(stop)
          : Promise.resolve({ ...data, id: 1 }),
      ),
    };
    dataSource.createQueryRunner.mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager,
    });

    await expect(
      service.provisionAccount({
        sessionId: 's-1',
        firstName: 'Ana',
        lastName: 'Diaz',
        jobTitle: 'Owner',
        workEmail: 'admin@acme.com',
        password: 'Secret123',
        termsAccepted: true,
      } as never),
    ).rejects.toBe(stop);

    const userSave = manager.save.mock.calls.find(
      ([entity]) => entity === User,
    );
    expect(userSave![1]).toMatchObject({ username: 'admin-2' });
  });

  it('rejects executive tier during select-subscription', async () => {
    planRepo.findOne.mockResolvedValue(mockPlans[2]);
    await expect(
      service.selectSubscription('executive'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
