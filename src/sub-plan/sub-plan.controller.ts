//src/sub-plan/sub-plan.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { SubPlanService } from './sub-plan.service';
import { CreateSubPlanDto } from './dto/create-sub-plan.dto';
import { SubPlanResponseDto } from './dto/sub-plan-response.dto';
import { UpdateSubPlanDto } from './dto/update-sub-plan.dto';
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
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from '../common/dtos/error-response.dto';
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
  @ApiBody({ type: CreateSubPlanDto })
  @Post()
  async create(@Body() dto: CreateSubPlanDto): Promise<SubPlan> {
    return this.subPlanService.create(dto);
  }
  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiOkResponse({
    description: 'List of all subscription plans',
    type: [SubPlanResponseDto],
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @UseGuards(JwtAuthGuard, RolesGuard) // ✅ Protegemos con JWT y roles
  @Roles('portal_admin') // ✅ Solo usuarios con rol "portal_admin" pueden acceder
  async findAll(): Promise<SubPlanResponseDto[]> {
    return this.subPlanService.findAll();
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
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
        name: 'Plan Básico',
        description: 'Acceso limitado',
        price: 9.99,
        billingCycle: 'monthly',
        status: 'active',
        createdAt: '2025-10-01T13:21:51.237Z',
        updatedAt: '2025-10-01T13:21:51.237Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Subscription plan not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Subscription plan not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const plan = await this.subPlanService.findOne(id);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
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
    type: SubPlanResponseDto,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubPlanDto: UpdateSubPlanDto,
  ): Promise<SubPlanResponseDto> {
    return this.subPlanService.update(id, updateSubPlanDto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN)
  @Scopes(Scope.ADMIN_PORTAL)
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription Plan ID' })
  @ApiOkResponse({ description: 'Subscription plan deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Subscription plan not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DeleteSubPlanResponseDto> {
    await this.subPlanService.remove(id);
    return {
      success: true,
      message: 'Subscription plan deleted successfully',
    };
  }
}
