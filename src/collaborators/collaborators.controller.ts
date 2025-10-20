import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CollaboratorsService } from './collaborators.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiBody,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Collaborator } from './entities/collaborator.entity';
import { CollaboratorResponseDto } from './dto/collaborator-response.dto';
import { GetCollaboratorsQueryDto } from './dto/get-collaborators-query.dto';
import { PaginatedCollaboratorsResponseDto } from './dto/paginated-collaborators-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';

@ApiTags('Collaborators')
@ApiBearerAuth()
@Controller('collaborators')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CollaboratorsController {
  constructor(private readonly collaboratorsService: CollaboratorsService) { }

  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Collaborator' })
  @ApiCreatedResponse({
    description: 'Collaborator created successfully',
    type: CollaboratorResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only create collaborators for your own merchant' })
  @ApiNotFoundResponse({ description: 'User or Merchant not found' })
  @ApiConflictResponse({ description: 'User is already a collaborator of another merchant' })
  @ApiBody({ type: CreateCollaboratorDto })
  async create(
    @Body() dto: CreateCollaboratorDto,
    @Request() req: any,
  ): Promise<CollaboratorResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    return this.collaboratorsService.create(dto, authenticatedUserMerchantId);
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
    summary: 'Get all Collaborators with pagination and filters',
    description: 'Retrieves a paginated list of collaborators for the authenticated user\'s merchant. Supports filtering by status. The response excludes creation and update dates but includes basic merchant and user information.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (minimum 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (1-100)',
    example: 10
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter collaborators by status',
    example: 'ACTIVO',
    enum: ['ACTIVO', 'INACTIVO', 'VACACIONES', 'DELETED']
  })
  @ApiOkResponse({ 
    description: 'Paginated list of collaborators retrieved successfully',
    type: PaginatedCollaboratorsResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 1,
            user_id: 1,
            merchant_id: 1,
            name: 'Juan Pérez',
            role: 'MESERO',
            status: 'ACTIVO',
            merchant: {
              id: 1,
              name: 'Restaurant ABC'
            },
            user: {
              id: 1,
              firstname: 'juan_user',
              lastname: 'juan@email.com'
            }
          }
        ],
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized'
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User must be associated with a merchant to view collaborators',
    schema: {
      example: {
        statusCode: 403,
        message: 'User must be associated with a merchant to view collaborators',
        error: 'Forbidden'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: 'Merchant not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant with ID 999 not found',
        error: 'Not Found'
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid query parameters or business rule violation',
    schema: {
      examples: {
        invalidPage: {
          summary: 'Invalid page number',
          value: {
            statusCode: 400,
            message: 'page must not be less than 1',
            error: 'Bad Request'
          }
        },
        invalidLimit: {
          summary: 'Invalid limit',
          value: {
            statusCode: 400,
            message: 'limit must not be greater than 100',
            error: 'Bad Request'
          }
        }
      }
    }
  })
  async findAll(
    @Query() query: GetCollaboratorsQueryDto,
    @Request() req: any,
  ): Promise<PaginatedCollaboratorsResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    return this.collaboratorsService.findAll(query, authenticatedUserMerchantId);
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
    summary: 'Get a Collaborator by ID',
    description: 'Retrieves a specific collaborator by its ID. Users can only access collaborators from their own merchant. The response excludes creation and update dates but includes basic merchant and user information.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Collaborator ID' })
  @ApiOkResponse({ 
    description: 'Collaborator found successfully',
    type: CollaboratorResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only view collaborators from your own merchant' })
  @ApiNotFoundResponse({ description: 'Collaborator, User or Merchant not found' })
  @ApiBadRequestResponse({ description: 'Invalid collaborator ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<CollaboratorResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    return this.collaboratorsService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a Collaborator by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Collaborator ID' })
  @ApiOkResponse({ description: 'Collaborator updated successfully', type: CollaboratorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only update collaborators from your own merchant' })
  @ApiNotFoundResponse({ description: 'Collaborator, User or Merchant not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data or ID' })
  @ApiConflictResponse({ description: 'User is already a collaborator of another merchant' })
  @ApiBody({ type: UpdateCollaboratorDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollaboratorDto,
    @Request() req: any,
  ): Promise<CollaboratorResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    return this.collaboratorsService.update(id, dto, authenticatedUserMerchantId);
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
  @ApiOperation({ 
    summary: 'Soft delete a Collaborator by ID',
    description: 'Performs a soft delete by changing the collaborator status to "deleted". Only merchant administrators can delete collaborators from their own merchant. The collaborator information is returned after deletion (excluding creation and update dates) along with basic merchant and user information.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Collaborator ID to delete' })
  @ApiOkResponse({ 
    description: 'Collaborator soft deleted successfully',
    type: CollaboratorResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - You can only delete collaborators from your own merchant' })
  @ApiNotFoundResponse({ description: 'Collaborator, User or Merchant not found' })
  @ApiBadRequestResponse({ description: 'Invalid collaborator ID' })
  @ApiConflictResponse({ description: 'Collaborator is already deleted or has active dependencies' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<CollaboratorResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    return this.collaboratorsService.remove(id, authenticatedUserMerchantId);
  }
}

