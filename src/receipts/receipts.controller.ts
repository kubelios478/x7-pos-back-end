import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query, Request, ParseIntPipe, Put } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { GetReceiptsQueryDto, ReceiptSortBy } from './dto/get-receipts-query.dto';
import { ApiBearerAuth, ApiBadRequestResponse, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiExtraModels, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { OneReceiptResponseDto, PaginatedReceiptsResponseDto } from './dto/receipt-response.dto';
import { ErrorResponse } from '../common/dtos/error-response.dto';

@ApiTags('Receipts')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new receipt' })
  @ApiBody({ type: CreateReceiptDto })
  @ApiCreatedResponse({ description: 'Receipt created', type: OneReceiptResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiConflictResponse({ description: 'Receipt already exists for this order and type', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Order not found', type: ErrorResponse })
  async create(@Body() dto: CreateReceiptDto, @Request() req: any): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.receiptsService.create(dto, authenticatedUserMerchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get all receipts' })
  @ApiQuery({ name: 'orderId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'deleted'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, enum: Object.values(ReceiptSortBy) })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiOkResponse({ description: 'Receipts retrieved', type: PaginatedReceiptsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async findAll(@Query() query: GetReceiptsQueryDto, @Request() req: any): Promise<PaginatedReceiptsResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.receiptsService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a receipt by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Receipt retrieved', type: OneReceiptResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.receiptsService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a receipt' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateReceiptDto })
  @ApiOkResponse({ description: 'Receipt updated', type: OneReceiptResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReceiptDto, @Request() req: any): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.receiptsService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete a receipt (logical)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Receipt deleted', type: OneReceiptResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not found', type: ErrorResponse })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<OneReceiptResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.receiptsService.remove(id, authenticatedUserMerchantId);
  }
}
