import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Request, ParseIntPipe, Put } from '@nestjs/common';
import { CashTransactionsService } from './cash-transactions.service';
import { CreateCashTransactionDto } from './dto/create-cash-transaction.dto';
import { UpdateCashTransactionDto } from './dto/update-cash-transaction.dto';
import { ApiBearerAuth, ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { OneCashTransactionResponseDto, PaginatedCashTransactionsResponseDto } from './dto/cash-transaction-response.dto';
import { GetCashTransactionsQueryDto, CashTransactionSortBy } from './dto/get-cash-transactions-query.dto';
import { ErrorResponse } from '../common/dtos/error-response.dto';

@ApiTags('Cash Transactions')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cash-transactions')
export class CashTransactionsController {
  constructor(private readonly cashTransactionsService: CashTransactionsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new cash transaction' })
  @ApiBody({ type: CreateCashTransactionDto })
  @ApiCreatedResponse({ description: 'Cash transaction created', type: OneCashTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Related resource not found', type: ErrorResponse })
  async create(@Body() dto: CreateCashTransactionDto, @Request() req: any): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashTransactionsService.create(dto, authenticatedUserMerchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get all cash transactions' })
  @ApiQuery({ name: 'cashDrawerId', required: false, type: Number })
  @ApiQuery({ name: 'orderId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['sale','refund','withdrawal','deposit'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active','deleted'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: Object.values(CashTransactionSortBy) })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC','DESC'] })
  @ApiOkResponse({ description: 'Cash transactions retrieved', type: PaginatedCashTransactionsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(@Query() query: GetCashTransactionsQueryDto, @Request() req: any): Promise<PaginatedCashTransactionsResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashTransactionsService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a cash transaction by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Cash transaction retrieved', type: OneCashTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashTransactionsService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a cash transaction' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCashTransactionDto })
  @ApiOkResponse({ description: 'Cash transaction updated', type: OneCashTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCashTransactionDto, @Request() req: any): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashTransactionsService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete a cash transaction (logical)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Cash transaction deleted', type: OneCashTransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<OneCashTransactionResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.cashTransactionsService.remove(id, authenticatedUserMerchantId);
  }
}
