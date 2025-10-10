//src/sub-plan/sub-plan.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  BadRequestException,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SubPlanService } from './sub-plan.service';
import { CreateSubPlanDto } from './dto/create-sub-plan.dto';
import { SubPlanResponseDto } from './dto/sub-plan-response.dto';
import { UpdateSubPlanDto } from './dto/update-sub-plan.dto';
import { GetSubPlansDto } from './dto/get-sub-plan.dto';
import { DeleteSubPlanResponseDto } from './dto/delete-sub-plan.dto';
import { SubPlan } from './entity/sub-plan.entity';
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
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Subscription Plans')
@Controller('sub-plan')
export class SubPlanController {
  constructor(private readonly subPlanService: SubPlanService) {}

  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiCreatedResponse({
    description: 'The subscription plan has been successfully created',
    type: SubPlan,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @Post()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiCreatedResponse({
    description: 'The subscription plan has been successfully created',
    type: SubPlan,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({
    description: 'Subscription plan with this name already exists',
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('portal_admin')
  @ApiBody({ type: CreateSubPlanDto })
  @Post()
  async create(@Body() dto: CreateSubPlanDto): Promise<SubPlan> {
    return this.subPlanService.create(dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get all subscription plans with filters and pagination',
  })
  @ApiOkResponse({
    description: 'List of subscription plans',
    type: [SubPlanResponseDto],
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
  @Roles('portal_admin')
  async findAll(@Query() query: GetSubPlansDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status;

    return this.subPlanService.findAll({ page, limit, status });
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a subscription plan by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the subscription plan',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription plan found',
    type: SubPlanResponseDto,
    schema: {
      example: {
        id: 1,
        name: 'Basic Plan',
        description: 'Acceso limitado',
        price: 9.99,
        billingCycle: 'monthly',
        status: 'active',
        createdAt: '2025-10-01T13:21:51.237Z',
        updatedAt: '2025-10-01T13:21:51.237Z',
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
    description: 'Subscription plan not found',
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
  async getOne(@Param('id', ParseIntPipe) id: number) {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    const plan = await this.subPlanService.findOne(id);
    return plan;
  }
  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update subscription plan by ID' })
  @ApiBody({
    description: 'Fields to update in the subscription plan',
    type: UpdateSubPlanDto,
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
    description: 'Subscription plan successfully updated',
    schema: {
      example: {
        message: 'Subscription plan with ID 5 was successfully updated.',
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
    description: 'Subscription plan not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription plan with id 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Subscription plan with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'A subscription plan with this name already exists.',
        error: 'Conflict',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubPlanDto: UpdateSubPlanDto,
  ): Promise<{ message: string }> {
    return this.subPlanService.update(id, updateSubPlanDto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the subscription plan to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Subscription plan deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Subscription plan deleted successfully',
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
    description: 'Subscription plan not found',
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
  ): Promise<DeleteSubPlanResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    await this.subPlanService.remove(id);
    return {
      success: true,
      message: `Subscription plan with id ${id} deleted successfully`,
    };
  }
}
