import { Controller, Get, Param, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { OneReservationStatusHistoryResponse } from './dto/reservation-status-history-response.dto';
import { AllPaginatedReservationStatusHistory } from './dto/all-paginated-reservation-status-history.dto';
import { GetReservationStatusHistoryQueryDto } from './dto/get-reservation-status-history-query.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Reservation Status History')
@ApiBearerAuth()
@Controller('reservation-status-history')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationStatusHistoryController {
  constructor(private readonly historyService: ReservationStatusHistoryService) { }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all merchant status history' })
  @ApiResponse({ status: 200, type: AllPaginatedReservationStatusHistory })
  findAllGlobal(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: GetReservationStatusHistoryQueryDto,
  ): Promise<AllPaginatedReservationStatusHistory> {
    return this.historyService.findAllGlobal(user.merchant.id, queryDto);
  }

  @Get('by-reservation/:reservationId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get status history of a reservation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.historyService.findAll(reservationId, user.merchant.id, page, limit);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get status history entry by ID' })
  @ApiResponse({ status: 200, type: OneReservationStatusHistoryResponse })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneReservationStatusHistoryResponse> {
    return this.historyService.findOne(id, user.merchant.id);
  }
}
