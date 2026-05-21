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
  })
  @ApiOkResponse({ type: InventoryStockAlertResponseDto, isArray: true })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetInventoryStockAlertsQueryDto,
  ) {
    return this.inventoryStockAlertsService.findAll(user.merchant.id, query);
  }

  @Patch(':id/acknowledge')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB)
  @ApiOperation({ summary: 'Acknowledge (resolve) a stock alert' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: InventoryStockAlertResponseDto })
  async acknowledge(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InventoryStockAlertResponseDto> {
    return this.inventoryStockAlertsService.acknowledge(user.merchant.id, id);
  }
}
