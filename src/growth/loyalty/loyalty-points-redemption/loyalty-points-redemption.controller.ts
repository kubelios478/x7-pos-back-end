import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import { LoyaltyPointsRedemptionService } from './loyalty-points-redemption.service';
import { LoyaltyRedeemableBalanceResponseDto } from './dto/loyalty-redeemable-balance-response.dto';
import { CreateLoyaltyPointsLockDto } from './dto/create-loyalty-points-lock.dto';
import { LoyaltyPointsLockResponseDto } from './dto/loyalty-points-lock-response.dto';

@ApiTags('Loyalty Points Redemption')
@ApiBearerAuth()
@Controller('loyalty-points-redemption')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LOYALTY_CUSTOMERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LoyaltyPointsRedemptionController {
  constructor(
    private readonly loyaltyPointsRedemptionService: LoyaltyPointsRedemptionService,
  ) {}

  @Get('balance/:loyaltyCustomerId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get redeemable loyalty points balance (with exchange rate)',
    description:
      'Returns current points, reserved points (active locks), available points, and monetary value using the merchant configured redemption exchange rate.',
  })
  @ApiParam({ name: 'loyaltyCustomerId', type: Number })
  @ApiOkResponse({ type: LoyaltyRedeemableBalanceResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async getBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('loyaltyCustomerId', ParseIntPipe) loyaltyCustomerId: number,
  ): Promise<LoyaltyRedeemableBalanceResponseDto> {
    return this.loyaltyPointsRedemptionService.getRedeemableBalance(
      loyaltyCustomerId,
      user.merchant.id,
    );
  }

  @Post('locks')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Reserve points for an order (lock)',
    description:
      'Creates a short-lived server-side reservation to prevent double-spending across terminals. The server validates the customer balance and order balance due, ignoring conflicting client input.',
  })
  @ApiBody({ type: CreateLoyaltyPointsLockDto })
  @ApiCreatedResponse({ type: LoyaltyPointsLockResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponse })
  @ApiUnauthorizedResponse({ type: ErrorResponse })
  @ApiForbiddenResponse({ type: ErrorResponse })
  @ApiNotFoundResponse({ type: ErrorResponse })
  async createLock(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLoyaltyPointsLockDto,
  ): Promise<LoyaltyPointsLockResponseDto> {
    return this.loyaltyPointsRedemptionService.createLock({
      dto,
      authenticatedUserMerchantId: user.merchant.id,
      cashierUserId: user.id,
    });
  }
}
