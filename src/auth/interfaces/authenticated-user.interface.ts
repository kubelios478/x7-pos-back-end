//src/auth/interfaces/authenticated-user.interface.ts
import { UserRole } from '../../platform-saas/users/constants/role.enum';
import { Scope } from '../../platform-saas/users/constants/scope.enum';
export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  scope: Scope;
  merchant: {
    id: number;
    /** Company that owns this merchant (set by login / JwtStrategy). Used to scope multi-tenant data. */
    companyId?: number;
  };
  /** `subscription_plan.id` for the merchant's active subscription (set by login / JwtStrategy). */
  planId?: number;
  /** Feature entity IDs the merchant may manage under their current subscription plan (set by login / JwtStrategy). */
  authorizedFeatureIds?: number[];
  /** Merchant's active cash register shift ID (injected by ActiveShiftGuard). */
  activeShiftId?: number;
}
