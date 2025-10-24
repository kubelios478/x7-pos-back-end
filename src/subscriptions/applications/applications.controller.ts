//src/subscriptions/applications/applications.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationEntity } from './entity/application-entity';
import { UpdateApplicationDto } from './dto/update-application.dto';
import {
  AllApplicationResponseDto,
  ApplicationResponseDto,
  OneApplicationResponseDto,
} from './dto/application-response.dto';
import {
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiTags,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly appService: ApplicationsService) {}
  @ApiOperation({ summary: 'Create a new Application' })
  @ApiCreatedResponse({
    description: 'The Application has been successfully created.',
    type: ApplicationEntity,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({
    description: 'Application with this name already exists',
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
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
    @Body() dto: CreateApplicationDto,
  ): Promise<OneApplicationResponseDto> {
    return this.appService.create(dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get all Applications',
  })
  @ApiOkResponse({
    description: 'List of Applications',
    type: [ApplicationResponseDto],
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
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  async findAll(): Promise<AllApplicationResponseDto> {
    return this.appService.findAll();
  }
  @Get(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get a Application by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Application',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Application found',
    type: ApplicationResponseDto,
    schema: {
      example: {
        id: 1,
        name: 'Sample Application',
        description: 'This is a sample Application',
        category: 'utilities',
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
    description: 'Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Application with id 5 not found',
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
    const plan = await this.appService.findOne(id);
    return plan;
  }
  @Patch(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update Application by ID' })
  @ApiBody({
    description: 'Fields to update in the Application',
    type: UpdateApplicationDto,
    examples: {
      example1: {
        summary: 'Update only name',
        value: { name: 'Updated Application Name' },
      },
      example2: {
        summary: 'Update multiple fields',
        value: {
          name: 'ApplicationTest',
          description: 'Is an Test',
          category: 'SAMPLE',
          status: 'active',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Application successfully updated',
    schema: {
      example: {
        message: 'Application with ID 5 was successfully updated.',
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
    description: 'Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Application with id 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Application with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Application with this name already exists.',
        error: 'Conflict',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApplicationDto,
  ): Promise<OneApplicationResponseDto> {
    return this.appService.update(id, dto);
  }
  @Delete(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete a Application' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Application to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Application deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Application deleted successfully',
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
    description: 'Application not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Application with id 5 not found',
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
  ): Promise<OneApplicationResponseDto> {
    return this.appService.remove(id);
  }
}
