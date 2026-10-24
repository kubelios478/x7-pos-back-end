//src/platform-saas/subscriptions/subscriptions.controller.ts
//
// Self-service: the merchant admin sees its company's subscription and payment history.
// These routes are deliberately not feature-gated, so a company whose subscription expired
// can still log in, see why and renew (POST /subscription-payments/intent).
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import {
  MySubscriptionPaymentsResponseDto,
  MySubscriptionResponseDto,
  QueryMySubscriptionPaymentsDto,
} from './dto/my-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

function companyIdOf(user: AuthenticatedUser): number {
  const companyId = user.merchant?.companyId;
  if (!companyId) {
    ErrorHandler.forbidden('User must be associated with a company');
  }
  return companyId;
}

@ApiTags('Platform SaaS - Subscriptions - My Subscription')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Only merchant admins of a company' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MERCHANT_ADMIN)
@Scopes(
  Scope.MERCHANT_ANDROID,
  Scope.MERCHANT_CLOVER,
  Scope.MERCHANT_IOS,
  Scope.MERCHANT_WEB,
)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({
    summary: "Current subscription of the user's company",
    description:
      'Returns the most recent company subscription (null if there is none) with its plan and whether it grants access today, plus the latest pending payment intent, if any. To change or renew the plan, create a payment intent with POST /subscription-payments/intent; the plan is applied when the payment is confirmed. Available plans: GET /onboarding/subscription-tiers.',
  })
  @ApiOkResponse({ type: MySubscriptionResponseDto })
  getMySubscription(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MySubscriptionResponseDto> {
    return this.subscriptionsService.getMySubscription(companyIdOf(user));
  }

  @Get('me/payments')
  @ApiOperation({
    summary: "Subscription payments of the user's company",
    description: 'Most recent first: pending intents, paid and rejected.',
  })
  @ApiOkResponse({ type: MySubscriptionPaymentsResponseDto })
  getMyPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryMySubscriptionPaymentsDto,
  ): Promise<MySubscriptionPaymentsResponseDto> {
    return this.subscriptionsService.getMyPayments(companyIdOf(user), query);
  }
}
