//src/core/configuration/utils/merchant-scoping.util.spec.ts
import { Repository } from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { resolveMerchantContext, assertOwnsCompany } from './merchant-scoping.util';

describe('merchant-scoping.util', () => {
  let merchantRepository: Repository<Merchant>;

  const mockMerchantAdminUser: AuthenticatedUser = {
    id: 1,
    email: 'merchant-admin@test.com',
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
    merchant: { id: 10 },
  };

  const mockPortalAdminUser: AuthenticatedUser = {
    id: 2,
    email: 'portal-admin@test.com',
    role: UserRole.PORTAL_ADMIN,
    scope: Scope.ADMIN_PORTAL,
    merchant: { id: 0 },
  };

  beforeEach(() => {
    merchantRepository = {
      findOne: jest.fn(),
    } as unknown as Repository<Merchant>;
  });

  describe('resolveMerchantContext', () => {
    it('resolves the merchant and companyId for the user', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 10, companyId: 7 } as Merchant);

      const result = await resolveMerchantContext(
        merchantRepository,
        mockMerchantAdminUser,
      );

      expect(merchantRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        select: ['id', 'companyId'],
      });
      expect(result).toEqual({
        merchant: { id: 10, companyId: 7 },
        companyId: 7,
      });
    });

    it('throws forbidden when the merchant has no resolvable company', async () => {
      jest.spyOn(merchantRepository, 'findOne').mockResolvedValue(null);

      await expect(
        resolveMerchantContext(merchantRepository, mockMerchantAdminUser),
      ).rejects.toThrow();
    });
  });

  describe('assertOwnsCompany', () => {
    it('is a no-op for a portal admin regardless of companyId', async () => {
      const findOneSpy = jest.spyOn(merchantRepository, 'findOne');

      await expect(
        assertOwnsCompany(merchantRepository, mockPortalAdminUser, 999),
      ).resolves.toBeUndefined();
      expect(findOneSpy).not.toHaveBeenCalled();
    });

    it('resolves without throwing when the companyId matches', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 10, companyId: 7 } as Merchant);

      await expect(
        assertOwnsCompany(merchantRepository, mockMerchantAdminUser, 7),
      ).resolves.toBeUndefined();
    });

    it('throws forbidden when the companyId does not match', async () => {
      jest
        .spyOn(merchantRepository, 'findOne')
        .mockResolvedValue({ id: 10, companyId: 7 } as Merchant);

      await expect(
        assertOwnsCompany(merchantRepository, mockMerchantAdminUser, 999),
      ).rejects.toThrow();
    });
  });
});
