import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { LoyaltyAnalyticsService } from './loyalty-analytics.service';
import { GetLoyaltyAnalyticsQueryDto } from './dto/get-loyalty-analytics-query.dto';
import { OneLoyaltyAnalyticsResponseDto } from './dto/loyalty-analytics-response.dto';

@ApiTags('Loyalty Analytics')
@ApiBearerAuth()
@Controller('loyalty-analytics')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LOYALTY_POINT_TRANSACTIONS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LoyaltyAnalyticsController {
  constructor(
    private readonly loyaltyAnalyticsService: LoyaltyAnalyticsService,
  ) {}

  @Get('report')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Loyalty redemption vs issuance report',
    description:
      'Aggregates loyalty point transactions (issued vs redeemed) for a date range, computes redemption rate on the server, groups results by month, and returns outstanding points liability for accounting. Optional VIP filter by minimum lifetime accumulated points.',
  })
  @ApiQuery({ name: 'fromDate', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'toDate', required: true, example: '2026-06-30' })
  @ApiQuery({
    name: 'minLifetimePoints',
    required: false,
    example: 5000,
    description: 'VIP customers: lifetime points >= this value',
  })
  @ApiOkResponse({ type: OneLoyaltyAnalyticsResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async getReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyAnalyticsQueryDto,
  ): Promise<OneLoyaltyAnalyticsResponseDto> {
    return this.loyaltyAnalyticsService.getReport(query, user.merchant.id);
  }
}
