import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { SubscriptionAccessService } from 'src/auth/subscription-access.service';
import { getAllSubscriptionFeatureIds } from 'src/common/subscription/subscription-feature-ids';
import {
  MSG_COMPANY_SUBSCRIPTION_OUTDATED,
  MSG_NO_COMPANY_PLAN,
} from 'src/auth/subscription-access.service';

export type RealtimeAuthenticatedUser = AuthenticatedUser & {
  companyId: number;
};

interface JwtPayload {
  sub: string | number;
  email: string;
  role: UserRole;
}

@Injectable()
export class RealtimeAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {}

  async authenticateToken(token: string): Promise<RealtimeAuthenticatedUser> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const userId =
      typeof payload.sub === 'string' ? parseInt(payload.sub, 10) : payload.sub;
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['merchant'],
    });

    if (!user || !user.merchant) {
      throw new UnauthorizedException('Invalid token');
    }

    const isPortalStaff =
      user.role === UserRole.PORTAL_ADMIN || user.role === UserRole.PORTAL_USER;

    let planId: number | undefined;
    let authorizedFeatureIds: number[];
    if (isPortalStaff) {
      planId = undefined;
      authorizedFeatureIds = getAllSubscriptionFeatureIds();
    } else {
      const companyId = user.merchant.companyId;
      if (!companyId) {
        throw new UnauthorizedException('Invalid token');
      }
      try {
        const access =
          await this.subscriptionAccessService.getSubscriptionAccessForCompany(
            companyId,
          );
        planId = access.planId;
        authorizedFeatureIds = access.authorizedFeatureIds;
      } catch (err) {
        const message = (err as { message?: string }).message ?? '';
        if (
          message === MSG_NO_COMPANY_PLAN ||
          message === MSG_COMPANY_SUBSCRIPTION_OUTDATED
        ) {
          planId = undefined;
          authorizedFeatureIds = [];
        } else {
          throw err;
        }
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: { id: user.merchant.id },
      companyId: user.merchant.companyId,
      planId,
      authorizedFeatureIds,
    };
  }
}
