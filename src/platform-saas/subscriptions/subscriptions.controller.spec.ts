import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  const service = { getMySubscription: jest.fn(), getMyPayments: jest.fn() };

  const merchantAdmin = {
    id: 10,
    email: 'admin@merchant.dev',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 1, companyId: 5 },
  } as AuthenticatedUser;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [{ provide: SubscriptionsService, useValue: service }],
    }).compile();
    controller = module.get(SubscriptionsController);
  });

  it("reads the subscription of the user's company", async () => {
    await controller.getMySubscription(merchantAdmin);
    expect(service.getMySubscription).toHaveBeenCalledWith(5);
  });

  it("reads the payments of the user's company", async () => {
    await controller.getMyPayments(merchantAdmin, { page: 2, limit: 5 });
    expect(service.getMyPayments).toHaveBeenCalledWith(5, {
      page: 2,
      limit: 5,
    });
  });

  it('rejects a user without a company', () => {
    const orphan = {
      ...merchantAdmin,
      merchant: { id: 1 },
    } as AuthenticatedUser;
    expect(() => controller.getMySubscription(orphan)).toThrow(
      ForbiddenException,
    );
    expect(service.getMySubscription).not.toHaveBeenCalled();
  });
});
