import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { CreateLoyaltyPointsTransactionDto } from './dto/create-loyalty-points-transaction.dto';
import { UpdateLoyaltyPointsTransactionDto } from './dto/update-loyalty-points-transaction.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { GetLoyaltyPointsTransactionQueryDto } from './dto/get-loyalty-points-transaction-query.dto';
import { AllPaginatedLoyaltyPointsTransactionDto } from './dto/all-paginated-loyalty-points-transaction.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import {
  LoyaltyPointsTransactionResponseDto,
  OneLoyaltyPointsTransactionResponse,
} from './dto/loyalty-points-transaction-response.dto';

@ApiExtraModels(
  ErrorResponse,
  OneLoyaltyPointsTransactionResponse,
  LoyaltyPointsTransactionResponseDto,
  AllPaginatedLoyaltyPointsTransactionDto,
)
@ApiBearerAuth()
@ApiTags('Growth - Loyalty - Points Transactions')
@Controller('loyalty-points-transactions')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LOYALTY_POINT_TRANSACTIONS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LoyaltyPointsTransactionController {
  constructor(
    private readonly loyaltyPointsTransactionService: LoyaltyPointsTransactionService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Loyalty Points Transaction',
    description:
      'Creates a new loyalty points transaction (earn/redeem/adjust) for a customer.',
  })
  @ApiCreatedResponse({
    description: 'Loyalty Points Transaction created successfully',
    type: OneLoyaltyPointsTransactionResponse,
    schema: {
      example: {
        statusCode: 201,
        message: 'Loyalty Points Transaction Created successfully',
        data: {
          id: 1,
          description: 'Earned points from purchase',
          source: 'ORDER',
          points: 100,
          loyaltyCustomer: {
            id: 1,
            customer: {
              id: 42,
              name: 'Jane Doe',
            },
          },
          order: {
            id: 10,
            orderNumber: 'ORD-1001',
          },
          payment: null,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request - Invalid input data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'loyalty_customer_id is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
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
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Loyalty Points Transaction already exists',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: 'Transaction already exists for this order',
        error: 'Conflict',
      },
    },
  })
  @ApiBody({ type: CreateLoyaltyPointsTransactionDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    createLoyaltyPointsTransactionDto: CreateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.create(
      merchantId,
      createLoyaltyPointsTransactionDto,
    );
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all loyalty points transactions with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty points transactions with optional filters. Users can only see loyalty points transactions from their own merchant.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10,
  })
  @ApiOkResponse({
    description:
      'Paginated list of loyalty points transactions retrieved successfully',
    type: AllPaginatedLoyaltyPointsTransactionDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Points Transactions retrieved successfully',
        data: [
          {
            id: 1,
            description: 'Earned points from purchase',
            source: 'ORDER',
            points: 100,
            loyaltyCustomer: {
              id: 1,
              customer: {
                id: 42,
                name: 'Jane Doe',
              },
            },
            order: {
              id: 10,
              orderNumber: 'ORD-1001',
            },
            payment: null,
            createdAt: '2024-01-15T10:00:00.000Z',
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing authentication token',
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
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or business rule violation',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Page must be >= 1',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyPointsTransactionQueryDto,
  ): Promise<AllPaginatedLoyaltyPointsTransactionDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.findAll(query, merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get a Loyalty Points Transaction by ID',
    description:
      'Retrieves details of a single loyalty points transaction including associated customer, order, and payment details.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Points Transaction ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Loyalty Points Transaction found',
    type: OneLoyaltyPointsTransactionResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Points Transaction retrieved successfully',
        data: {
          id: 1,
          description: 'Earned points from purchase',
          source: 'ORDER',
          points: 100,
          loyaltyCustomer: {
            id: 1,
            customer: {
              id: 42,
              name: 'Jane Doe',
            },
          },
          order: {
            id: 10,
            orderNumber: 'ORD-1001',
          },
          payment: null,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Loyalty Points Transaction ID is incorrect',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
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
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Loyalty Points Transaction not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty points transaction not found',
        error: 'Not Found',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.findOne(id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Update a Loyalty Points Transaction',
    description: 'Updates points or description of a loyalty points transaction.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Points Transaction ID',
    example: 1,
  })
  @ApiBody({ type: UpdateLoyaltyPointsTransactionDto })
  @ApiOkResponse({
    description: 'Loyalty Points Transaction updated successfully',
    type: OneLoyaltyPointsTransactionResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Points Transaction Updated successfully',
        data: {
          id: 1,
          description: 'Adjusted points from return',
          source: 'ADJUSTMENT',
          points: 50,
          loyaltyCustomer: {
            id: 1,
            customer: {
              id: 42,
              name: 'Jane Doe',
            },
          },
          order: null,
          payment: null,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Points must be a valid number',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
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
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Loyalty Points Transaction not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty points transaction not found',
        error: 'Not Found',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateLoyaltyPointsTransactionDto: UpdateLoyaltyPointsTransactionDto,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.update(
      id,
      merchantId,
      updateLoyaltyPointsTransactionDto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Delete a Loyalty Points Transaction',
    description:
      'Soft-deletes a loyalty points transaction by ID and updates the associated customer points balance.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the loyalty points transaction to soft-delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Loyalty Points Transaction deleted successfully',
    type: OneLoyaltyPointsTransactionResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Points Transaction Deleted successfully',
        data: {
          id: 1,
          description: 'Earned points from purchase',
          source: 'ORDER',
          points: 100,
          loyaltyCustomer: {
            id: 1,
            customer: {
              id: 42,
              name: 'Jane Doe',
            },
          },
          order: {
            id: 10,
            orderNumber: 'ORD-1001',
          },
          payment: null,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Loyalty Points Transaction ID is incorrect',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
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
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Loyalty Points Transaction not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty points transaction not found',
        error: 'Not Found',
      },
    },
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyPointsTransactionResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyPointsTransactionService.remove(id, merchantId);
  }
}
