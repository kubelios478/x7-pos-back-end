import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Movement } from './entities/movement.entity';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  AllMovementsResponse,
  OneMovementResponse,
} from './dto/movement-response.dto';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Movement' })
  @ApiCreatedResponse({
    description: 'Movement created successfully',
    type: Movement,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['movement quantity must be an integer number'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Movement already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createMovementDto: CreateMovementDto,
  ): Promise<OneMovementResponse> {
    return this.movementsService.create(user, createMovementDto);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get all movements' })
  @ApiOkResponse({ description: 'List of all movements', type: [Movement] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'No movements found' })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AllMovementsResponse> {
    const merchantId = user.merchant.id;
    return this.movementsService.findAll(merchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Get a Movement by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Movement ID' })
  @ApiOkResponse({ description: 'Movement found', type: Movement })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Movement not found' })
  @ApiResponse({
    status: 404,
    description: 'Movement not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Movement not found',
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
        statusCode: 404,
        message: 'Validation failed (numeric string is expected)',
        error: 'Bad Request',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMovementResponse> {
    const merchantId = user.merchant.id;
    return this.movementsService.findOne(id, merchantId);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Update a Movement' })
  @ApiParam({ name: 'id', type: Number, description: 'Movement ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Movement not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiBody({ type: UpdateMovementDto })
  @ApiOkResponse({
    description: 'Movement updated successfully',
    type: Movement,
  })
  @ApiResponse({
    status: 404,
    description: 'Movement not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Movement not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'quantity must be an integer number',
        error: 'Bad Request',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMovementDto: UpdateMovementDto,
  ): Promise<OneMovementResponse> {
    return this.movementsService.update(user, id, updateMovementDto);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete a Movement' })
  @ApiParam({ name: 'id', type: Number, description: 'Movement ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Movement not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Movement deleted' })
  @ApiResponse({
    status: 404,
    description: 'Movement not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Movement not found',
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
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneMovementResponse> {
    return this.movementsService.remove(user, id);
  }
}
