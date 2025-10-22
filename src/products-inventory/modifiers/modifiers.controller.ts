import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { Scope } from 'src/users/constants/scope.enum';
import { Modifier } from './entities/modifier.entity';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('modifiers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Create a new Modifier' })
  @ApiOkResponse({
    description: 'Modifier created successfully',
    type: Modifier,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['Variant must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Modifier already exists' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createModifierDto: CreateModifierDto,
  ) {
    return this.modifiersService.create(user, createModifierDto);
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
  @ApiOperation({ summary: 'Get all Modifiers' })
  @ApiOkResponse({ description: 'List of all Modifiers', type: [Modifier] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'No Modifiers found' })
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
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const merchantId = user.merchant.id;
    return this.modifiersService.findAll(merchantId);
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
  @ApiOperation({ summary: 'Get a Modifier by ID' })
  @ApiOkResponse({ description: 'Modifier found', type: Modifier })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Modifier not found' })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Modifier not found',
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
  ) {
    const merchantId = user.merchant.id;
    return this.modifiersService.findOne(id, merchantId);
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
  @ApiOperation({ summary: 'Update a Modifier' })
  @ApiParam({ name: 'id', type: Number, description: 'Modifier ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Modifier not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({
    description: 'Modifier updated successfully',
    type: Modifier,
  })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Modifier not found',
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
        message: 'name must be longer than or equal to 2 characters',
        error: 'Bad Request',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateModifierDto: UpdateModifierDto,
  ) {
    return this.modifiersService.update(user, id, updateModifierDto);
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
  @ApiOperation({ summary: 'Delete a Modifier' })
  @ApiParam({ name: 'id', type: Number, description: 'Modifier ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Modifier not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiOkResponse({ description: 'Modifier deleted' })
  @ApiResponse({
    status: 404,
    description: 'Modifier not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Modifier not found',
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
  ) {
    return this.modifiersService.remove(user, id);
  }
}
