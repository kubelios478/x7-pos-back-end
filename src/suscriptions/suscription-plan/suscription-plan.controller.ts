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
import { SuscriptionPlanService } from './suscription-plan.service';
import { CreateSuscriptionPlanDto } from './dto/create-suscription-plan.dto';
import { SuscriptionPlanResponseDto } from './dto/suscription-plan-response.dto';
import { UpdateSuscriptionPlanDto } from './dto/update-suscription-plan.dto';
import { GetSuscriptionPlanDto } from './dto/get-suscription-plan.dto';
import { DeleteSuscriptionPlanDto } from './dto/delete-suscription-plan.dto';
import { SuscriptionPlan } from './entity/suscription-plan.entity';
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
@Controller('suscription-plan')
export class SuscriptionPlanController {
  constructor(private readonly subPlanService: SuscriptionPlanService) {}

  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiCreatedResponse({
    description: 'The subscription plan has been successfully created',
    type: SuscriptionPlan,
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
    type: SuscriptionPlan,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({
    description: 'Subscription plan with this name already exists',
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('portal_admin')
  @ApiBody({ type: CreateSuscriptionPlanDto })
  @Post()
  async create(
    @Body() dto: CreateSuscriptionPlanDto,
  ): Promise<SuscriptionPlan> {
    return this.subPlanService.create(dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get all subscription plans with filters and pagination',
  })
  @ApiOkResponse({
    description: 'List of subscription plans',
    type: [SuscriptionPlanResponseDto],
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
  async findAll(@Query() query: GetSuscriptionPlanDto) {
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
    type: SuscriptionPlanResponseDto,
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
    type: UpdateSuscriptionPlanDto,
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
    @Body() updateSubPlanDto: UpdateSuscriptionPlanDto,
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
  ): Promise<DeleteSuscriptionPlanDto> {
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
