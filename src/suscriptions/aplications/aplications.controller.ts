//src/suscriptions/aplications/aplications.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AplicationsService } from './aplications.service';
import { CreateAplicationDto } from './dto/create-aplication.dto';
import { GetAplicationDto } from './dto/get-aplication.dto';
import { AplicationEntity } from './entity/aplication-entity';
import { UpdateAplicationDto } from './dto/update-aplication.dto';
import { AplicationResponseDto } from './dto/aplication-response.dto';
import { DeleteAplicationDto } from './dto/delete-aplication.dto';
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
@Controller('aplications')
export class AplicationsController {
  constructor(private readonly appService: AplicationsService) {}
  @ApiOperation({ summary: 'Create a new application' })
  @ApiCreatedResponse({
    description: 'The application has been successfully created.',
    type: AplicationEntity,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({
    description: 'Aplication with this name already exists',
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
  async create(@Body() dto: CreateAplicationDto): Promise<AplicationEntity> {
    return this.appService.create(dto);
  }
  @Get()
  @ApiOperation({
    summary: 'Get all Aplications',
  })
  @ApiOkResponse({
    description: 'List of Aplications',
    type: [AplicationResponseDto],
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
  async findAll(@Query() query: GetAplicationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const status = query.status;

    return this.appService.findAll({ page, limit, status });
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
  @ApiOperation({ summary: 'Get a aplication by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the aplication',
    example: 1,
  })
  @ApiOkResponse({
    description: 'aplication found',
    type: AplicationResponseDto,
    schema: {
      example: {
        id: 1,
        name: 'Sample Aplication',
        description: 'This is a sample aplication',
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
    description: 'Aplication not found',
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
  @ApiOperation({ summary: 'Update aplication by ID' })
  @ApiBody({
    description: 'Fields to update in the aplication',
    type: UpdateAplicationDto,
    examples: {
      example1: {
        summary: 'Update only name',
        value: { name: 'Updated Aplication Name' },
      },
      example2: {
        summary: 'Update multiple fields',
        value: {
          name: 'AplicationTest',
          description: 'Is an Test',
          category: 'SAMPLE',
          status: 'active',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Aplication successfully updated',
    schema: {
      example: {
        message: 'Aplication with ID 5 was successfully updated.',
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
    description: 'Aplication not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Aplication with id 5 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Aplication with this name already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'A aplication with this name already exists.',
        error: 'Conflict',
      },
    },
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAplicationDto: UpdateAplicationDto,
  ): Promise<{ message: string }> {
    return this.appService.update(id, updateAplicationDto);
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
  @ApiOperation({ summary: 'Delete a aplication' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the aplication to delete',
    example: 1,
  })
  @ApiOkResponse({
    description: 'aplication deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'aplication deleted successfully',
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
    description: 'Aplication not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Aplication with id 5 not found',
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
  ): Promise<DeleteAplicationDto> {
    if (id <= 0) {
      throw new BadRequestException('ID must be a positive integer');
    }
    await this.appService.remove(id);
    return {
      success: true,
      message: `Subscription plan with id ${id} deleted successfully`,
    };
  }
}
