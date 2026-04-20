import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ReservationTableService } from './reservation-table.service';
import { CreateReservationTableDto } from './dto/create-reservation-table.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { OneReservationTableResponse } from './dto/reservation-table-response.dto';
import { AllPaginatedReservationTables } from './dto/all-paginated-reservation-tables.dto';

@ApiTags('Reservation Tables')
@ApiBearerAuth()
@Controller('reservation-table')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationTableController {
  constructor(private readonly reservationTableService: ReservationTableService) { }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Assign a table to a reservation' })
  @ApiResponse({ status: 201, type: OneReservationTableResponse })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createReservationTableDto: CreateReservationTableDto
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.create(createReservationTableDto, user.merchant.id);
  }

  @Get('by-reservation/:reservationId')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get all tables of a reservation' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: AllPaginatedReservationTables })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AllPaginatedReservationTables> {
    return this.reservationTableService.findAll(reservationId, user.merchant.id, page, limit);
  }

  @Delete(':reservationId/:tableId')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Remove a table assignment from a reservation' })
  @ApiResponse({ status: 200, type: OneReservationTableResponse })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<OneReservationTableResponse> {
    return this.reservationTableService.remove(reservationId, tableId, user.merchant.id);
  }
}
