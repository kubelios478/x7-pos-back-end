import { ForbiddenException } from '@nestjs/common';
import { merchantScopeOf } from './merchant-scope.util';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';

const userWith = (role: UserRole, merchantId?: number) =>
  ({
    id: 1,
    role,
    merchant: merchantId ? { id: merchantId } : undefined,
  }) as unknown as AuthenticatedUser;

describe('merchantScopeOf', () => {
  it.each([UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER])(
    'locks %s to their own merchant',
    (role) => {
      expect(merchantScopeOf(userWith(role, 7))).toBe(7);
    },
  );

  it.each([UserRole.PORTAL_ADMIN, UserRole.PORTAL_USER])(
    'does not restrict %s',
    (role) => {
      expect(merchantScopeOf(userWith(role, 7))).toBeUndefined();
    },
  );

  it('rejects a merchant user without a merchant instead of leaving them unrestricted', () => {
    expect(() => merchantScopeOf(userWith(UserRole.MERCHANT_ADMIN))).toThrow(
      ForbiddenException,
    );
  });
});
