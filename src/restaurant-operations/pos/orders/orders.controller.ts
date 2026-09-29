import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Req,
  UseGuards,
  Query,
  Request,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { RequireActiveShift } from 'src/auth/decorators/active-shift.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { Request as ExpressRequest } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import {
  OneOrderResponseDto,
  PaginatedOrdersResponseDto,
} from './dto/order-response.dto';
import { GetOrdersQueryDto, OrderSortBy } from './dto/get-orders-query.dto';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ProcessPaymentDto } from '../order-payments/dto/process-payment.dto';
import { CompletePurchaseDto } from './dto/complete-purchase.dto';
import { RefundOrderDto } from './dto/refund-order.dto';

type AuthenticatedRequest = ExpressRequest & { user: AuthenticatedUser };

@ApiTags('Restaurant operations - POS - Orders')
@ApiBearerAuth()
@ApiExtraModels(ErrorResponse)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
@Controller('orders')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.ORDERS)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @RequireActiveShift()
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Creates a new order for the authenticated merchant. Validates that all related entities (table, collaborator, subscription, customer) belong to the merchant. businessStatus defaults to pending; items are optional and can be added later via POST /order-item.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({
    description: 'Order created successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: 'Order created successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'pending',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: null,
          updatedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Order status is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create orders for your own merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Related resource not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Table with ID 1 not found',
        error: 'Not Found',
      },
    },
  })
  async create(
    @Body() dto: CreateOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.create(
      dto,
      authenticatedUserMerchantId,
      req.user?.activeShiftId,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all orders',
    description:
      'Retrieves all orders for the authenticated merchant with pagination and filtering options. Only returns orders with status = ACTIVE by default.',
  })
  @ApiQuery({
    name: 'tableId',
    required: false,
    type: Number,
    description: 'Filter by table ID',
  })
  @ApiQuery({
    name: 'collaboratorId',
    required: false,
    type: Number,
    description: 'Filter by collaborator ID',
  })
  @ApiQuery({
    name: 'subscriptionId',
    required: false,
    type: Number,
    description: 'Filter by subscription ID',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    type: Number,
    description: 'Filter by customer ID',
  })
  @ApiQuery({
    name: 'businessStatus',
    required: false,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    description: 'Filter by business status',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['dine_in', 'take_out', 'delivery'],
    description: 'Filter by order type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'deleted'],
    description: 'Filter by logical status (for deletion)',
  })
  @ApiQuery({
    name: 'createdDate',
    required: false,
    type: String,
    description: 'Filter by creation date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: Object.values(OrderSortBy),
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
  })
  @ApiOkResponse({
    description: 'Orders retrieved successfully',
    type: PaginatedOrdersResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Orders retrieved successfully',
        data: [
          {
            id: 1,
            merchantId: 1,
            tableId: 1,
            collaboratorId: 1,
            subscriptionId: 1,
            businessStatus: 'pending',
            type: 'dine_in',
            customerId: 1,
            status: 'active',
            createdAt: '2024-01-15T08:00:00Z',
            closedAt: null,
            updatedAt: '2024-01-15T08:00:00Z',
          },
        ],
        paginationMeta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Page must be >= 1',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You must be associated with a merchant',
        error: 'Forbidden',
      },
    },
  })
  async findAll(
    @Query() query: GetOrdersQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedOrdersResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.findAll(query, authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get an order by id',
    description:
      'Retrieves a single order by its ID. Only returns orders with status = ACTIVE.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({
    description: 'Order retrieved successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Order retrieved successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'pending',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: null,
          updatedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid id',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid id',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only access orders from your merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update an order',
    description:
      'Updates an existing order. Validates that all related entities belong to the merchant.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiOkResponse({
    description: 'Order updated successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Order updated successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'completed',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid business status',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only update orders from your merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete an order (logical)',
    description:
      'Performs a logical deletion of an order by setting status to DELETED.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID' })
  @ApiOkResponse({
    description: 'Order deleted successfully',
    type: OneOrderResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Order deleted successfully',
        data: {
          id: 1,
          merchantId: 1,
          tableId: 1,
          collaboratorId: 1,
          subscriptionId: 1,
          businessStatus: 'pending',
          type: 'dine_in',
          customerId: 1,
          status: 'active',
          createdAt: '2024-01-15T08:00:00Z',
          closedAt: null,
          updatedAt: '2024-01-15T08:00:00Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid id',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid id',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only delete orders from your merchant',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ): Promise<OneOrderResponseDto> {
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    return this.ordersService.remove(id, authenticatedUserMerchantId);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Complete (close) a pending order',
    description:
      "Moves an order from 'pending' to 'completed': recalculates subtotal from its items, applies the selected merchant tax rules (or every active one when `merchantTaxRuleIds` is omitted), recomputes total and balance due, and persists the order taxes. The discount is capped by role (50% of subtotal for merchant_admin, 10% otherwise). Once completed, the order can be paid via POST /orders/payment.",
  })
  @ApiParam({ name: 'id', type: Number, description: 'Order ID', example: 42 })
  @ApiBody({
    type: CompletePurchaseDto,
    examples: {
      selectedTaxes: {
        summary: 'Apply specific tax rules',
        value: { merchantTaxRuleIds: [1, 2] },
      },
      allActiveTaxes: {
        summary: 'Apply every active tax rule of the merchant',
        value: {},
      },
    },
  })
  @ApiOkResponse({
    description: 'Order completed successfully',
    type: OneOrderResponseDto,
    example: {
      statusCode: 200,
      message: 'Order completed successfully',
      data: {
        id: 42,
        merchantId: 1,
        tableId: 5,
        collaboratorId: 3,
        subscriptionId: 1,
        businessStatus: 'completed',
        type: 'dine_in',
        customerId: 7,
        status: 'active',
        orderNumber: '000042',
        source: 'pos',
        guestCount: 2,
        subtotal: 40,
        taxTotal: 5.5,
        discountTotal: 0,
        tipTotal: 0,
        total: 45.5,
        paidTotal: 0,
        balanceDue: 45.5,
        isPaid: false,
        deliveryAddress: null,
        deliveryZoneId: null,
        deliveryFee: 0,
        deliveryStatus: 'unassigned',
        kitchenStatus: 'ready',
        readyAt: '2026-09-27T13:40:00.000Z',
        preparingAt: '2026-09-27T13:25:00.000Z',
        createdAt: '2026-09-27T13:10:00.000Z',
        closedAt: null,
        updatedAt: '2026-09-27T14:05:12.000Z',
        inventoryConsumedAt: null,
        loyaltyPointsAwardedAt: null,
        orderItems: [
          {
            id: 101,
            orderId: 42,
            order: { id: 42, businessStatus: 'completed', type: 'dine_in' },
            productId: 10,
            product: {
              id: 10,
              name: 'Classic Burger',
              sku: 'BURG-001',
              basePrice: 25,
            },
            variantId: null,
            variant: null,
            quantity: 1,
            price: 25,
            discount: 0,
            totalPrice: 25,
            notes: 'No onions',
            status: 'active',
            kitchenStatus: 'ready',
            createdAt: '2026-09-27T13:12:00.000Z',
            updatedAt: '2026-09-27T13:40:00.000Z',
          },
          {
            id: 102,
            orderId: 42,
            order: { id: 42, businessStatus: 'completed', type: 'dine_in' },
            productId: 11,
            product: {
              id: 11,
              name: 'Lemonade',
              sku: 'DRK-004',
              basePrice: 5,
            },
            variantId: 3,
            variant: { id: 3, name: 'Large', price: 5, sku: 'DRK-004-L' },
            quantity: 3,
            price: 5,
            discount: 0,
            totalPrice: 15,
            notes: null,
            status: 'active',
            kitchenStatus: 'ready',
            createdAt: '2026-09-27T13:12:30.000Z',
            updatedAt: '2026-09-27T13:40:00.000Z',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      "Invalid id, invalid body, or the order is not in 'pending' status",
    type: ErrorResponse,
    examples: {
      notPending: {
        summary: 'Order is not pending',
        value: {
          statusCode: 400,
          message: 'Order must be in pending state',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      invalidId: {
        summary: 'Non-numeric id',
        value: {
          statusCode: 400,
          message: 'Validation failed (numeric string is expected)',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      invalidBody: {
        summary: 'Invalid merchantTaxRuleIds',
        value: {
          statusCode: 400,
          message: 'each value in merchantTaxRuleIds must be an integer number',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired JWT',
    type: ErrorResponse,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description:
      'Discount exceeds the limit allowed for the role, or role/scope/plan not allowed',
    type: ErrorResponse,
    examples: {
      discountLimit: {
        summary: 'Discount above the allowed limit',
        value: {
          statusCode: 403,
          message: 'Discount exceeds allowed limit',
          error: 'Forbidden',
        },
      },
      scope: {
        summary: 'Scope not allowed',
        value: {
          statusCode: 403,
          message: 'Scope not enough (admin_portal)',
          error: 'Forbidden',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    type: ErrorResponse,
    example: {
      statusCode: 404,
      message: 'Order not found',
      error: 'Not Found',
    },
  })
  async completePurchase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompletePurchaseDto,
    @Req() req: AuthenticatedUser,
  ) {
    return this.ordersService.completePurchase(id, dto, req);
  }

  @Post('payment')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Pay a completed order',
    description:
      "Registers one or more payments (split payment) for an order in 'completed' status. The sum of the payment amounts must match the order total (±0.01); tips go in `tipAmount` and are not part of that sum. In one transaction it creates the order payments on the merchant's active shift, marks the order as 'paid', issues a locked INVOICE receipt and creates the tip settlements according to the merchant tip rule (individual, pool or role-based).",
  })
  @ApiBody({
    type: ProcessPaymentDto,
    examples: {
      splitPayment: {
        summary: 'Split payment: card with tip + cash',
        value: {
          orderId: 42,
          payments: [
            { amount: 30, method: 'card', tipAmount: 3 },
            { amount: 15.5, method: 'cash' },
          ],
          source: 'pos',
          merchantTipRuleId: 1,
          currency: 'USD',
        },
      },
      singlePayment: {
        summary: 'Single cash payment, default tip rule',
        value: {
          orderId: 42,
          payments: [{ amount: 45.5, method: 'cash' }],
          source: 'pos',
          currency: 'USD',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Payment processed. Note: `total` is serialized as a decimal string (raw DB value) while `paid` and `tip` are numbers.',
    example: {
      success: true,
      message: 'Payment processed successfully',
      data: {
        orderId: 42,
        invoiceNumber: 'INV-000128',
        orderNumber: '000042',
        status: 'paid',
        total: '45.50',
        paid: 45.5,
        tip: 3,
        paymentMethods: [
          { method: 'card', amount: 30, tipAmount: 3 },
          { method: 'cash', amount: 15.5, tipAmount: 0 },
        ],
        merchantId: 1,
        shiftId: 9,
        paidAt: '2026-09-27T14:05:12.345Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Body validation failed or a business rule was violated (order not completed, totals mismatch, no active shift, receipt already issued, no active tip rule...)',
    type: ErrorResponse,
    examples: {
      validation: {
        summary: 'Several validation rules failed',
        value: {
          statusCode: 400,
          message: 'Validation failed',
          errors: [
            'orderId must be a number conforming to the specified constraints',
            'currency must be longer than or equal to 3 characters',
          ],
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      notCompleted: {
        summary: 'Order is not completed',
        value: {
          statusCode: 400,
          message: 'Only completed orders can be paid',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      totalMismatch: {
        summary: 'Payments do not add up to the order total',
        value: {
          statusCode: 400,
          message: 'Payment total does not match order total',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      noShift: {
        summary: 'No open shift for the merchant',
        value: {
          statusCode: 400,
          message: 'No active shift found',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      alreadyPaid: {
        summary: 'Receipt already issued',
        value: {
          statusCode: 400,
          message: 'Receipt already exists for this order',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired JWT',
    type: ErrorResponse,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description:
      'The order belongs to another merchant, or role/scope/plan not allowed',
    type: ErrorResponse,
    examples: {
      otherMerchant: {
        summary: 'Order from another merchant',
        value: {
          statusCode: 403,
          message: 'Access denied',
          error: 'Forbidden',
        },
      },
      role: {
        summary: 'Role not allowed',
        value: {
          statusCode: 403,
          message: 'Role not enough (portal_admin)',
          error: 'Forbidden',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    type: ErrorResponse,
    example: {
      statusCode: 404,
      message: 'Order not found',
      error: 'Not Found',
    },
  })
  async processPayment(
    @Body() dto: ProcessPaymentDto,
    @Req() req: AuthenticatedUser,
  ) {
    return this.ordersService.processPayment(dto, req.merchant.id, req);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Refund a paid order (full or by items)',
    description:
      "Refunds an order in 'paid' status. With `fullRefund: true` the whole total is refunded; otherwise `itemIds` is required and the refunded amount is (items subtotal / order subtotal) × order total. Creates negative order payments (source 'REFUND') on the active shift, lowers the shift balance, cancels the tip settlements (fails if any is already liquidated), reverses loyalty points and stores `reason` on the order. The order ends 'cancelled' (full refund or all items) or 'partially_refunded'. Admin only.",
  })
  @ApiBody({
    type: RefundOrderDto,
    examples: {
      partialRefund: {
        summary: 'Partial refund by items',
        value: {
          orderId: 42,
          itemIds: [102],
          reason: 'Customer returned a cold drink',
        },
      },
      fullRefund: {
        summary: 'Full refund',
        value: {
          orderId: 42,
          fullRefund: true,
          reason: 'Order charged twice by mistake',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Refund processed. When any original payment was not cash the message warns that the card refund must be handled manually.',
    example: {
      success: true,
      message: 'Refund processed. Card refund must be handled manually.',
      data: {
        orderId: 42,
        refundedAmount: 17.06,
        status: 'partially_refunded',
        refundedBy: 4,
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Body validation failed or a business rule was violated (order not paid, missing itemIds, no active shift, tips already liquidated...)',
    type: ErrorResponse,
    examples: {
      validation: {
        summary: 'Missing reason',
        value: {
          statusCode: 400,
          message: 'reason must be a string',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      notPaid: {
        summary: 'Order is not paid',
        value: {
          statusCode: 400,
          message: 'Only paid orders can be refunded',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      missingItems: {
        summary: 'Partial refund without itemIds',
        value: {
          statusCode: 400,
          message: 'Item IDs are required',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
      liquidatedTips: {
        summary: 'Tips already liquidated',
        value: {
          statusCode: 400,
          message:
            'Cannot refund tips that are already liquidated. Manual adjustment required.',
          timestamp: '2026-09-27T14:05:12.345Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or expired JWT',
    type: ErrorResponse,
    example: {
      statusCode: 401,
      message: 'Unauthorized',
    },
  })
  @ApiForbiddenResponse({
    description:
      'The order belongs to another merchant, the user is not merchant_admin, or scope/plan not allowed',
    type: ErrorResponse,
    examples: {
      otherMerchant: {
        summary: 'Order from another merchant',
        value: {
          statusCode: 403,
          message: 'Access denied',
          error: 'Forbidden',
        },
      },
      notAdmin: {
        summary: 'Role not allowed',
        value: {
          statusCode: 403,
          message: 'Role not enough (merchant_user)',
          error: 'Forbidden',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    type: ErrorResponse,
    example: {
      statusCode: 404,
      message: 'Order not found',
      error: 'Not Found',
    },
  })
  async refundOrder(
    @Body() dto: RefundOrderDto,
    @Req() req: AuthenticatedUser,
  ) {
    return this.ordersService.refundOrder(dto, req.merchant?.id, req);
  }
}
