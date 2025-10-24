//src/sub-plan/sub-plan.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionPlanService } from './subscription-plan.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import {
  AllSubscriptionPlanResponseDto,
  OneSubscriptionPlanResponseDto,
} from './dto/subscription-plan-response.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlan } from './entity/subscription-plan.entity';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Subscription Plans')
@Controller('subscription-plan')
export class SubscriptionPlanController {
  constructor(
    private readonly subscriptionPlanService: SubscriptionPlanService,
  ) {}

  @ApiOperation({ summary: 'Create a new Subscription Plan' })
  @ApiCreatedResponse({
    description: 'The Subscription Plan has been successfully created',
    type: SubscriptionPlan,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({ summary: 'Create a new Subscription Plan' })
  @ApiCreatedResponse({
    description: 'The Subscription Plan has been successfully created',
    type: SubscriptionPlan,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({
    description: 'Subscription Plan with this name already exists',
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @ApiBody({ type: CreateSubscriptionPlanDto })
  @Post()
  async create(
    @Body() dto: CreateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.create(dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get all Subscription Plans',
  })
  @ApiOkResponse({
    description: 'List of Subscription Plans',
    type: [OneSubscriptionPlanResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient role.',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request parameters',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'page must be a positive number',
          'limit must be a positive number',
        ],
        error: 'Bad Request',
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  async findAll(): Promise<AllSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.findAll();
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a Subscription Plan by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Subscription Plan',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Plan found',
    type: AllSubscriptionPlanResponseDto,
    schema: {
      example: {
        id: 1,
        name: 'Basic Plan',
        description: 'Acceso limitado',
        price: 9.99,
        billingCycle: 'monthly',
        status: 'active',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a positive integer',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Plan with id 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    const plan = await this.subscriptionPlanService.findOne(id);
    return plan;
  }
  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a Subscription Plan' })
  @ApiBody({
    description: 'Fields to update in the Subscription Plan',
    type: UpdateSubscriptionPlanDto,
    examples: {
      example1: {
        summary: 'Update only name',
        value: { name: 'Updated Plan Name' },
      },
      example2: {
        summary: 'Update multiple fields',
        value: {
          name: 'Pro Plan',
          description: 'Full access to all features',
          price: 49.99,
          billingCycle: 'monthly',
          status: 'active',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Subscription Plan successfully updated',
    schema: {
      example: {
        message: 'Subscription Plan with ID 5 was successfully updated.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter or invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['id must be a number', 'name must be a string'],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription Plan with id 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Subscription Plan with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'A Subscription Plan with this name already exists.',
        error: 'Conflict',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionPlanDto: UpdateSubscriptionPlanDto,
  ): Promise<OneSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.update(id, updateSubscriptionPlanDto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a Subscription Plan' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Subscription Plan to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription Plan deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Subscription Plan deleted successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID parameter',
    schema: {
      example: {
        statusCode: 400,
        message: 'ID must be a positive integer',
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Subscription Plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription plan with id 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden. Insufficient permissions',
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneSubscriptionPlanResponseDto> {
    return this.subscriptionPlanService.remove(id);
  }
}
