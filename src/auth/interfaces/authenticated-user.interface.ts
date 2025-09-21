//src/auth/interfaces/authenticated-user.interface.ts
import { UserRole } from '../../users/constants/role.enum';
import { Scope } from '../../users/constants/scope.enum';
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  scope: Scope;
  merchant: {
    id: number;
  };
}
