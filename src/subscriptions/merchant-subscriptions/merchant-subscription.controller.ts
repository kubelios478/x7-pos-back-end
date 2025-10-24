//src/subscriptions/merchant-subscriptions/merchant-subscription.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { MerchantSuscriptionService } from './merchant-subscription.service';
import { CreateMerchantSubscriptionDto } from './dtos/create-merchant-subscription.dto';
import {
  AllMerchantSubscriptionSummaryDto,
  MerchantSubscriptionSummaryDto,
  OneMerchantSubscriptionSummaryDto,
} from './dtos/merchant-subscription-summary.dto';
import {
  ApiTags,
  ApiNotFoundResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import { UpdateMerchantSubscriptionDto } from './dtos/update-merchant-subscription.dto';

@ApiTags('Merchant Subscriptions')
@ApiBearerAuth()
@Controller('merchant-subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantSubscriptionController {
  constructor(
    private readonly merchantSubscriptionService: MerchantSuscriptionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new Merchant Subscription',
    description: 'Endpoint for create a new Merchant Subscription.',
  })
  @ApiBody({
    type: CreateMerchantSubscriptionDto,
    description: 'Require Data for a new Merchant Subscription',
  })
  @ApiCreatedResponse({
    description: 'Merchant Subscription created successfully',
    type: MerchantSubscriptionSummaryDto,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Invalid or missing authentication token',
  })
  @ApiConflictResponse({
    description:
      'Conflict: Merchant Subscription with the same details already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: 'Start date must be before end date',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant or Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Plan with id 3 not found',
        error: 'Not Found',
      },
    },
  })
  async create(
    @Body() dto: CreateMerchantSubscriptionDto,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.create(dto);
  }
  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get All Merchant Subscriptions',
    description: 'Endpoint for get ALL of the Merchant Subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'List all of the Merchant Subscriptions',
    type: [MerchantSubscriptionSummaryDto],
  })
  @ApiOperation({
    summary: 'Get all Merchant Subscriptions',
    description:
      'Retrieve a list of all Merchant Subscriptions, including related merchant and plan data.',
  })
  @ApiOkResponse({
    description: 'List of Merchant Subscriptions retrieved successfully',
    type: [MerchantSubscriptionSummaryDto],
    schema: {
      example: [
        {
          id: 1,
          merchant: { id: 5, name: 'Acme Corp' },
          plan: { id: 2, name: 'Gold Plan' },
          startDate: '2025-10-01T00:00:00.000Z',
          endDate: '2026-10-01T00:00:00.000Z',
          renewalDate: '2026-09-25T00:00:00.000Z',
          status: 'active',
          paymentMethod: 'credit_card',
        },
      ],
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient role or permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid query parameters or filters',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid pagination parameters',
        error: 'Bad Request',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      },
    },
  })
  async findAll(): Promise<AllMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.findAll();
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get one Merchant Subscription',
    description: 'Retrieve details of a specific Merchant Subscription by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Merchant Subscription ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Subscription retrieved successfully',
    type: MerchantSubscriptionSummaryDto,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID parameter',
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Merchant Subscription not found',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient permissions',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
  })
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }
    const merchantSubscription =
      await this.merchantSubscriptionService.findOne(id);
    return merchantSubscription;
  }

  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Update a Merchant Subscription',
    description: 'Endpoint to update an existing Merchant Subscription by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Merchant Subscription ID to update',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Subscription updated successfully',
    schema: {
      example: {
        message: 'Merchant Subscription with ID 1 updated successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID or request data',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID format. ID must be a number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Merchant Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription with ID 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient permissions',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantSubscriptionDto,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Delete a Merchant Subscription',
    description: 'Endpoint to delete a Merchant Subscription by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Merchant Subscription ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Merchant Subscription deleted successfully',
    schema: {
      example: {
        message: 'Merchant Subscription with ID 1 deleted successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID format',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid ID. Must be a positive number.',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant Subscription not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant Subscription with ID 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role or scope.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized. Missing or invalid authentication token.',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMerchantSubscriptionSummaryDto> {
    return this.merchantSubscriptionService.remove(id);
  }
}
