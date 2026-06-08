import {
  Controller,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiCreatedResponse, ApiBadRequestResponse, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { FeatureAccessGuard } from '../../../auth/guards/feature-access.guard';
import { RequireFeature } from '../../../auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from '../../../common/subscription/subscription-feature-ids';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { CashMovementsService } from './cash-movements.service';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';

@ApiTags('Cash Movements')
@ApiBearerAuth()
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.CASH_DRAWERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('cash-shifts')
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) { }

  @ApiOperation({
    summary: 'Record an expense (cash withdrawal) from the cash register',
    description: 'Allows recording cash withdrawals from the drawer for minor or urgent expenses in an OPEN shift. The expense amount cannot exceed the available balance.',
  })
  @ApiCreatedResponse({ description: 'Expense recorded successfully' })
  @ApiBadRequestResponse({ description: 'Insufficient funds or shift closed' })
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @Post(':shiftId/expenses')
  recordExpense(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.recordExpense(shiftId, dto, user.id, user.merchant.id);
  }

  @ApiOperation({
    summary: 'Record a manual cash inflow to the cash register (e.g. change, adjustment)',
    description: 'Allows recording manual cash inflows that are not from sales into the active shift. Sums the amount to the cash drawer current balance and notifies the admins.',
  })
  @ApiCreatedResponse({ description: 'Manual cash inflow recorded successfully' })
  @ApiBadRequestResponse({ description: 'Shift is closed or invalid input' })
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @Post(':shiftId/inflows')
  recordInflow(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.recordInflow(shiftId, dto, user.id, user.merchant.id);
  }

  @ApiOperation({
    summary: 'Get cash drawer movements for the shift',
    description: 'Detailed list of expenses recorded during the shift.',
  })
  @ApiOkResponse({ description: 'Movements retrieved successfully' })
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
  @Get(':shiftId/expenses')
  getExpenses(
    @Param('shiftId', ParseIntPipe) shiftId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashMovementsService.findByShift(shiftId, user.merchant.id);
  }
}
