import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { InventoryStockAlertsService } from './inventory-stock-alerts.service';
import { GetInventoryStockAlertsQueryDto } from './dto/get-inventory-stock-alerts-query.dto';
import { InventoryStockAlertResponseDto } from './dto/inventory-stock-alert-response.dto';
import { PaginatedInventoryStockAlertsResponseDto } from './dto/paginated-inventory-stock-alerts-response.dto';

@ApiTags('Inventory stock alerts')
@ApiBearerAuth()
@Controller('inventory-stock-alerts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.STOCK_AND_STOCK_MOVEMENTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class InventoryStockAlertsController {
  constructor(
    private readonly inventoryStockAlertsService: InventoryStockAlertsService,
  ) {}

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'List inventory stock alerts (filterable by category)',
    description:
      'Returns LOW and OUT_OF_STOCK alerts for the merchant. Real-time notifications use WebSocket event `inventory.stock_alert` on room `company:{companyId}`. Email is sent once per alert when SMTP_HOST is configured (see emailSentAt).',
  })
  @ApiOkResponse({ type: PaginatedInventoryStockAlertsResponseDto })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetInventoryStockAlertsQueryDto,
  ) {
    return this.inventoryStockAlertsService.findAll(user.merchant.id, query);
  }

  @Patch(':id/acknowledge')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({
    summary: 'Acknowledge (resolve) a stock alert',
    description: 'Marks the alert as RESOLVED in the dashboard.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Alert ID' })
  @ApiOkResponse({ type: InventoryStockAlertResponseDto })
  @ApiNotFoundResponse({ description: 'Alert not found for this merchant' })
  async acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InventoryStockAlertResponseDto> {
    return this.inventoryStockAlertsService.acknowledge(user.merchant.id, id);
  }
}
