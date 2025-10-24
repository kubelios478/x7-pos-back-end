//src/subscriptions/plan-applications/plan-applications.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  ParseIntPipe,
  Get,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiOkResponse,
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlanApplicationsService } from './plan-applications.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreatePlanApplicationDto } from './dto/create-plan-application.dto';
import {
  OnePlanApplicationResponseDto,
  AllPlanApplicationsResponseDto,
  PlanApplicationSummaryDto,
} from './dto/summary-plan-applications.dto';
import { UpdatePlanApplicationDto } from './dto/update-plan-application.dto';
import { PlanApplication } from './entity/plan-applications.entity';

@ApiTags('Plan Applications')
@Controller('plan-applications')
export class PlanApplicationsController {
  constructor(private readonly planAppService: PlanApplicationsService) {}

  @ApiOperation({ summary: 'Create a new Plan Application' })
  @ApiCreatedResponse({
    description: 'The Plan Aplication has been created successfully.',
    type: PlanApplication,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiConflictResponse({
    description: 'Plan Application with this combination already exists.',
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(
    @Body() dto: CreatePlanApplicationDto,
  ): Promise<OnePlanApplicationResponseDto> {
    return this.planAppService.create(dto);
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
    summary: 'Get all Plan Applications',
    description:
      'Retrieve a list of all Plan Applications, including related application and plan data.',
  })
  @ApiResponse({
    status: 200,
    description: 'List all of the Plan Applications',
    type: [PlanApplicationSummaryDto],
  })
  @ApiOkResponse({
    description: 'List of merchant subscriptions retrieved successfully',
    type: [PlanApplicationSummaryDto],
    schema: {
      example: [
        {
          id: 1,
          application: { id: 5, name: 'NewApplication' },
          plan: { id: 2, name: 'Gold Plan' },
          limits: { description: 'This are the limits' },
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
  async findAll(): Promise<AllPlanApplicationsResponseDto> {
    return this.planAppService.findAll();
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
    summary: 'Get one Plan Application',
    description: 'Retrieve details of a specific Plan Application by ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Plan ApplicationID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Plan Application retrieved successfully',
    type: PlanApplicationSummaryDto,
  })
  @ApiBadRequestResponse({
    description: 'Bad Request: Invalid ID parameter',
  })
  @ApiNotFoundResponse({
    description: 'Not Found: Plan Application not found',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: Insufficient permissions',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized: Missing or invalid authentication token',
  })
  async getOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OnePlanApplicationResponseDto> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    return this.planAppService.findOne(id);
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
    summary: 'Update a Plan Application',
    description: 'Endpoint to update an existing Plan Application',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Plan Application ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Plan Application updated successfully',
    schema: {
      example: {
        message: 'Plan Application with ID 1 updated successfully',
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
    description: 'Not Found: Plan Application not found',
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
    @Body() dto: UpdatePlanApplicationDto,
  ): Promise<OnePlanApplicationResponseDto> {
    return this.planAppService.update(id, dto);
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
  @ApiOperation({ summary: 'Delete a Plan Application' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Plan Application to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Plan Application deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Plan Application deleted successfully',
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
    description: 'Plan Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Plan Application with id 5 not found',
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
  ): Promise<OnePlanApplicationResponseDto> {
    return this.planAppService.remove(id);
  }
}
