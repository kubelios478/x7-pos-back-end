import { Reflector } from '@nestjs/core';
import { RecipesController } from './recipes.controller';
import { ROLES_KEY } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';

describe('RecipesController RBAC metadata', () => {
  const reflector = new Reflector();

  /* eslint-disable @typescript-eslint/unbound-method -- Reflector reads handler metadata */
  it('GET allows MERCHANT_ADMIN and MERCHANT_USER', () => {
    const roles = reflector.get<UserRole[] | undefined>(
      ROLES_KEY,
      RecipesController.prototype.findAll,
    );
    expect(roles).toEqual(
      expect.arrayContaining([UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER]),
    );
  });

  it('POST create is MERCHANT_ADMIN only', () => {
    const roles = reflector.get<UserRole[] | undefined>(
      ROLES_KEY,
      RecipesController.prototype.create,
    );
    expect(roles).toEqual([UserRole.MERCHANT_ADMIN]);
  });

  it('PUT update is MERCHANT_ADMIN only', () => {
    const roles = reflector.get<UserRole[] | undefined>(
      ROLES_KEY,
      RecipesController.prototype.update,
    );
    expect(roles).toEqual([UserRole.MERCHANT_ADMIN]);
  });
  /* eslint-enable @typescript-eslint/unbound-method */
});
