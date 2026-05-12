import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CashShiftsService } from './cash-shifts.service';
import { CreateCashShiftDto } from './dto/create-cash-shift.dto';
import { CloseCashShiftDto } from './dto/close-cash-shift.dto';
import { ManualCashTransactionDto } from './dto/manual-cash-transaction.dto';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';

import { FeatureAccessGuard } from '../../../auth/guards/feature-access.guard';
import { RequireFeature } from '../../../auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from '../../../common/subscription/subscription-feature-ids';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';

@ApiTags('Cash Shifts')
@ApiBearerAuth()
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.CASH_DRAWERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('cash-shifts')
export class CashShiftsController {
    constructor(private readonly cashShiftsService: CashShiftsService) { }

    @ApiOperation({ summary: 'Abrir un nuevo turno de caja' })
    @ApiResponse({ status: 201, description: 'Turno de caja abierto exitosamente' })
    @ApiResponse({ status: 409, description: 'Ya existe un turno de caja abierto' })
    @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
    @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
    @Post()
    openShift(
        @Body() dto: CreateCashShiftDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.cashShiftsService.openShift(dto, user.merchant.id);
    }

    @ApiOperation({ summary: 'Listar todos los turnos de caja' })
    @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
    @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
    @Get()
    findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.cashShiftsService.findAll(user.merchant.id);
    }

    @ApiOperation({ summary: 'Obtener el turno de caja activo del merchant' })
    @ApiResponse({ status: 200, description: 'Turno activo encontrado' })
    @ApiResponse({ status: 404, description: 'No hay turno activo' })
    @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
    @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
    @Get('active')
    findActive(@CurrentUser() user: AuthenticatedUser) {
        return this.cashShiftsService.findActiveShift(user.merchant.id);
    }

    @ApiOperation({ summary: 'Obtener un turno de caja por ID' })
    @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
    @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
    @Get(':id')
    findOne(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.cashShiftsService.findOne(id, user.merchant.id);
    }

    @ApiOperation({
        summary: 'Cerrar un turno de caja',
        description:
            'El backend calcula el systemAmount (balance del sistema), la difference (declaredAmount - systemAmount) y registra el cierre. El frontend solo envía declaredAmount y collaboratorId.',
    })
    @ApiResponse({ status: 200, description: 'Turno cerrado exitosamente con resumen de cierre' })
    @ApiResponse({ status: 400, description: 'El turno no está OPEN' })
    @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
    @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
    @Post(':id/close')
    closeShift(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CloseCashShiftDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.cashShiftsService.closeShift(id, dto, user.merchant.id);
    }

    @ApiOperation({
        summary: 'Añadir una transacción manual (Ingreso/Egreso)',
        description: 'Permite registrar retiros (pagos a proveedores) o ingresos extra en la caja abierta. Los retiros no pueden superar el dinero disponible en la caja.',
    })
    @ApiResponse({ status: 201, description: 'Transacción registrada exitosamente' })
    @ApiResponse({ status: 400, description: 'Fondos insuficientes o caja cerrada' })
    @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
    @Scopes(Scope.ADMIN_PORTAL, Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS, Scope.MERCHANT_CLOVER)
    @Post(':id/transactions/manual')
    addManualTransaction(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ManualCashTransactionDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        return this.cashShiftsService.addManualTransaction(id, dto, user.merchant.id);
    }
}
