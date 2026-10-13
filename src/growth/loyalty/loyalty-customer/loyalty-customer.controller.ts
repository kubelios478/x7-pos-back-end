import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

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
import { LoyaltyCustomerService } from './loyalty-customer.service';
import { CreateLoyaltyCustomerDto } from './dto/create-loyalty-customer.dto';
import { UpdateLoyaltyCustomerDto } from './dto/update-loyalty-customer.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';
import { Scopes } from '../../../auth/decorators/scopes.decorator';
import { ErrorResponse } from '../../../common/dtos/error-response.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { GetLoyaltyCustomersQueryDto } from './dto/get-loyalty-customers-query.dto';
import { AllPaginatedLoyaltyCustomerDto } from './dto/all-paginated-loyalty-customer.dto';
import { OneLoyaltyCustomerResponse } from './dto/loyalty-customer-response.dto';

@ApiExtraModels(ErrorResponse, OneLoyaltyCustomerResponse)
@ApiBearerAuth()
@ApiTags('Growth - Loyalty - Customers')
@Controller('loyalty-customers')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LOYALTY_CUSTOMERS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LoyaltyCustomerController {
  constructor(
    private readonly loyaltyCustomerService: LoyaltyCustomerService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Loyalty Customer',
    description:
      "Enrolls a customer into a merchant's loyalty program with initial points and tier assignment.",
  })
  @ApiCreatedResponse({
    description: 'Loyalty Customer created successfully',
    type: OneLoyaltyCustomerResponse,
    schema: {
      example: {
        statusCode: 201,
        message: 'Loyalty Customer Created successfully',
        data: {
          id: 1,
          customer: {
            id: 42,
            name: 'Jane Doe',
          },
          current_points: 0,
          lifetime_points: 0,
          joined_at: '2024-01-15T10:00:00.000Z',
          loyaltyProgram: {
            id: 1,
            name: 'VIP Rewards Program',
          },
          loyaltyTier: {
            id: 1,
            name: 'Bronze Tier',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or validation failure',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'customer_id is required',
        error: 'Bad Request',
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
  @ApiConflictResponse({
    description: 'Loyalty Customer already exists',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: 'Customer is already enrolled in this loyalty program',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  @ApiBody({ type: CreateLoyaltyCustomerDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLoyaltyCustomerDto: CreateLoyaltyCustomerDto,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.create(
      merchantId,
      createLoyaltyCustomerDto,
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
    summary: 'Get all loyalty customers with pagination and filters',
    description:
      'Retrieves a paginated list of loyalty customers with optional filters. Users can only see loyalty customers from their own merchant.',
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
    description: 'Paginated list of loyalty customers retrieved successfully',
    type: AllPaginatedLoyaltyCustomerDto,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Customers retrieved successfully',
        data: [
          {
            id: 1,
            customer: {
              id: 42,
              name: 'Jane Doe',
            },
            current_points: 150,
            lifetime_points: 500,
            joined_at: '2024-01-15T10:00:00.000Z',
            loyaltyProgram: {
              id: 1,
              name: 'VIP Rewards Program',
            },
            loyaltyTier: {
              id: 2,
              name: 'Gold Tier',
            },
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLoyaltyCustomersQueryDto,
  ): Promise<AllPaginatedLoyaltyCustomerDto> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.findAll(query, merchantId);
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
    summary: 'Get a Loyalty Customer by ID',
    description:
      'Retrieves details of a single loyalty customer including customer details, points, and program tier.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Customer ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Loyalty Customer found',
    type: OneLoyaltyCustomerResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Customer retrieved successfully',
        data: {
          id: 1,
          customer: {
            id: 42,
            name: 'Jane Doe',
          },
          current_points: 150,
          lifetime_points: 500,
          joined_at: '2024-01-15T10:00:00.000Z',
          loyaltyProgram: {
            id: 1,
            name: 'VIP Rewards Program',
          },
          loyaltyTier: {
            id: 2,
            name: 'Gold Tier',
          },
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
        message: 'Loyalty Customer ID is incorrect',
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
    description: 'Loyalty Customer not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty customer not found',
        error: 'Not Found',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.findOne(id, merchantId);
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
    summary: 'Update a Loyalty Customer',
    description:
      'Updates points, assigned tier, or other fields of a loyalty customer.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Loyalty Customer ID',
    example: 1,
  })
  @ApiBody({ type: UpdateLoyaltyCustomerDto })
  @ApiOkResponse({
    description: 'Loyalty Customer updated successfully',
    type: OneLoyaltyCustomerResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Customer Updated successfully',
        data: {
          id: 1,
          customer: {
            id: 42,
            name: 'Jane Doe',
          },
          current_points: 200,
          lifetime_points: 550,
          joined_at: '2024-01-15T10:00:00.000Z',
          loyaltyProgram: {
            id: 1,
            name: 'VIP Rewards Program',
          },
          loyaltyTier: {
            id: 2,
            name: 'Gold Tier',
          },
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
        message: 'Points cannot be negative',
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
    description: 'Loyalty Customer not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty customer not found',
        error: 'Not Found',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLoyaltyCustomerDto: UpdateLoyaltyCustomerDto,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.update(
      id,
      merchantId,
      updateLoyaltyCustomerDto,
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
    summary: 'Delete a Loyalty Customer',
    description:
      'Soft-deletes a loyalty customer by ID, setting is_active to false. Only available for MERCHANT_ADMIN users.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the loyalty customer to soft-delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Loyalty Customer deleted',
    type: OneLoyaltyCustomerResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Loyalty Customer Deleted successfully',
        data: {
          id: 1,
          customer: {
            id: 42,
            name: 'Jane Doe',
          },
          current_points: 150,
          lifetime_points: 500,
          joined_at: '2024-01-15T10:00:00.000Z',
          loyaltyProgram: {
            id: 1,
            name: 'VIP Rewards Program',
          },
          loyaltyTier: {
            id: 2,
            name: 'Gold Tier',
          },
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
        message: 'Loyalty Customer ID is incorrect',
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
    description: 'Loyalty Customer not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Loyalty customer not found',
        error: 'Not Found',
      },
    },
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLoyaltyCustomerResponse> {
    const merchantId = user.merchant.id;
    return this.loyaltyCustomerService.remove(id, merchantId);
  }
}

