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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MerchantSuscriptionService } from './merchant-suscription.service';
import { CreateMerchantSuscriptionDto } from './dtos/create-merchant-suscription.dto';
import { MerchantSubscriptionSummaryDto } from './dtos/merchant-subscription-summary.dto';
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
import { UpdateMerchantSuscriptionDto } from './dtos/update-merchant-subscription.dto';

@ApiTags('Merchant Subscriptions')
@ApiBearerAuth()
@Controller('merchant-suscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchSubController {
  constructor(private readonly merchSubService: MerchantSuscriptionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
  )
  @ApiOperation({
    summary: 'Create a new merchanrt suscription',
    description: 'Endpoint for create a new Merchant Suscription.',
  })
  @ApiBody({
    type: CreateMerchantSuscriptionDto,
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
  @ApiConflictResponse({
    description:
      'Conflict: Merchant already has an active subscription for this plan',
    schema: {
      example: {
        statusCode: 409,
        message:
          'Merchant Acme already has an active subscription for this plan.',
        error: 'Conflict',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Merchant or SubPlan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'SubPlan with id 3 not found',
        error: 'Not Found',
      },
    },
  })
  async create(
    @Body() dto: CreateMerchantSuscriptionDto,
  ): Promise<MerchantSubscriptionSummaryDto> {
    return this.merchSubService.create(dto);
  }

  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
  )
  @ApiOperation({
    summary: 'Get All merchant suscriptions',
    description: 'Endpoint for get ALL a new Merchant Suscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista todas las suscripciones de merchants',
    type: [MerchantSubscriptionSummaryDto],
  })
  @Get()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
  )
  @ApiOperation({
    summary: 'Get all merchant subscriptions',
    description:
      'Retrieve a list of all merchant subscriptions, including related merchant and plan data.',
  })
  @ApiOkResponse({
    description: 'List of merchant subscriptions retrieved successfully',
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
  async findAll(): Promise<MerchantSubscriptionSummaryDto[]> {
    try {
      const result = await this.merchSubService.findAll();

      if (!result.length) {
        // Opcional — depende de si quieres retornar 404 o []
        throw new NotFoundException('No merchant subscriptions found');
      }

      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Failed to retrieve subscriptions');
    }
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
  )
  @ApiOperation({
    summary: 'Get one merchant subscription',
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
  async getOne(@Param('id') id: string) {
    const numericId = Number(id);

    if (isNaN(numericId)) {
      throw new BadRequestException('Invalid ID format. ID must be a number.');
    }

    try {
      return await this.merchSubService.findOne(numericId);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'Unexpected error while retrieving subscription',
      );
    }
  }

  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
  )
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
    @Body() dto: UpdateMerchantSuscriptionDto,
  ): Promise<{ message: string }> {
    try {
      return await this.merchSubService.update(id, dto);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException(
        'Unexpected error while updating Merchant Subscription',
      );
    }
  }

  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
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
  ): Promise<{ message: string }> {
    if (id <= 0) {
      throw new BadRequestException('Invalid ID. Must be a positive number.');
    }

    try {
      return await this.merchSubService.remove(id);
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof BadRequestException) throw error;

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException(
        'Unexpected error while deleting Merchant Subscription',
      );
    }
  }
}
