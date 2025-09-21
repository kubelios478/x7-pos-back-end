// auth/auth.decorator.ts
import { applyDecorators } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { Scopes } from './scopes.decorator';

export function Auth(
  roles: string[] = [],
  scopes: string[] = [],
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ...(roles.length ? [Roles(...roles)] : []),
    ...(scopes.length ? [Scopes(...scopes)] : []),
  );
}
