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
  ForbiddenException,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftResponseDto } from './dto/shift-response.dto';
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
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ShiftRole } from './constants/shift-role.enum';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ 
    summary: 'Create a new shift',
    description: 'Creates a new shift for the authenticated user\'s merchant. Only merchant administrators can create shifts. The start time is required, end time is optional. Role defaults to WAITER if not specified.'
  })
  @ApiCreatedResponse({
    description: 'Shift created successfully',
    type: ShiftResponseDto,
    schema: {
      example: {
        id: 1,
        merchantId: 1,
        startTime: '2024-01-15T08:00:00Z',
        endTime: '2024-01-15T16:00:00Z',
        role: 'waiter',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data or business rule violation',
    schema: {
      example: {
        statusCode: 400,
        message: 'End time must be after start time',
        error: 'Bad Request'
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
    description: 'Forbidden - You can only create shifts for your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only create shifts for your own merchant',
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
  @ApiBody({ 
    type: CreateShiftDto,
    description: 'Shift creation data',
    examples: {
      example1: {
        summary: 'Basic shift',
        description: 'A simple shift with start and end time',
        value: {
          merchantId: 1,
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          role: 'waiter'
        }
      },
      example2: {
        summary: 'Shift without end time',
        description: 'A shift that is still ongoing',
        value: {
          merchantId: 1,
          startTime: '2024-01-15T08:00:00Z',
          role: 'cook'
        }
      }
    }
  })
  async create(@Body() dto: CreateShiftDto, @Request() req: any): Promise<ShiftResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    // Validar que el usuario tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to create shifts');
    }
    
    return this.shiftsService.create(dto, authenticatedUserMerchantId);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Get all shifts',
    description: 'Retrieves all shifts for the authenticated user\'s merchant. Shifts are ordered by start time in descending order (most recent first).'
  })
  @ApiOkResponse({
    description: 'List of shifts retrieved successfully',
    type: [ShiftResponseDto],
    schema: {
      example: [
        {
          id: 1,
          merchantId: 1,
          startTime: '2024-01-15T08:00:00Z',
          endTime: '2024-01-15T16:00:00Z',
          role: 'waiter',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          merchantId: 1,
          startTime: '2024-01-14T08:00:00Z',
          endTime: '2024-01-14T16:00:00Z',
          role: 'cook',
          createdAt: '2024-01-14T10:30:00Z',
          updatedAt: '2024-01-14T10:30:00Z'
        }
      ]
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
    description: 'Forbidden - User must be associated with a merchant to view shifts',
    schema: {
      example: {
        statusCode: 403,
        message: 'User must be associated with a merchant to view shifts',
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
  async findAll(@Request() req: any): Promise<ShiftResponseDto[]> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;

    // Validar que el usuario tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to view shifts');
    }

    return this.shiftsService.findAll(authenticatedUserMerchantId);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ 
    summary: 'Get a shift by ID',
    description: 'Retrieves a specific shift by its ID. Users can only access shifts from their own merchant.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Shift ID',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Shift found successfully',
    type: ShiftResponseDto,
    schema: {
      example: {
        id: 1,
        merchantId: 1,
        startTime: '2024-01-15T08:00:00Z',
        endTime: '2024-01-15T16:00:00Z',
        role: 'waiter',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
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
    description: 'Forbidden - You can only view shifts from your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only view shifts from your own merchant',
        error: 'Forbidden'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: 'Shift or merchant not found',
    schema: {
      examples: {
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift 999 not found',
            error: 'Not Found'
          }
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found'
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid ID format or value',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid shift ID',
        error: 'Bad Request'
      }
    }
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<ShiftResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;

    // Validar que el usuario tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to view shifts');
    }

    return this.shiftsService.findOne(id, authenticatedUserMerchantId);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ 
    summary: 'Update a shift by ID',
    description: 'Updates an existing shift for the authenticated user\'s merchant. Only merchant administrators can update shifts. All fields are optional. End time must be after start time if provided.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Shift ID to update',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Shift updated successfully',
    type: ShiftResponseDto,
    schema: {
      example: {
        id: 1,
        merchantId: 1,
        startTime: '2024-01-15T08:00:00Z',
        endTime: '2024-01-15T18:00:00Z',
        role: 'waiter',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T12:00:00Z'
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
    description: 'Forbidden - You can only update shifts from your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only update shifts from your own merchant',
        error: 'Forbidden'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: 'Shift not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Shift 999 not found',
        error: 'Not Found'
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data, ID format, or business rule violation',
    schema: {
      examples: {
        invalidId: {
          summary: 'Invalid ID format',
          value: {
            statusCode: 400,
            message: 'Validation failed (numeric string is expected)',
            error: 'Bad Request'
          }
        },
        invalidTime: {
          summary: 'Invalid time format',
          value: {
            statusCode: 400,
            message: 'Invalid start time format',
            error: 'Bad Request'
          }
        },
        invalidTimeOrder: {
          summary: 'Invalid time order',
          value: {
            statusCode: 400,
            message: 'End time must be after start time',
            error: 'Bad Request'
          }
        }
      }
    }
  })
  @ApiBody({ 
    type: UpdateShiftDto,
    description: 'Shift update data (all fields optional)',
    examples: {
      example1: {
        summary: 'Update end time only',
        description: 'Update only the end time of a shift',
        value: {
          endTime: '2024-01-15T18:00:00Z'
        }
      },
      example2: {
        summary: 'Update multiple fields',
        description: 'Update start time, end time and role',
        value: {
          startTime: '2024-01-15T09:00:00Z',
          endTime: '2024-01-15T17:00:00Z',
          role: 'cook'
        }
      },
      example3: {
        summary: 'Remove end time',
        description: 'Set end time to null (ongoing shift)',
        value: {
          endTime: null
        }
      }
    }
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftDto,
    @Request() req: any,
  ): Promise<ShiftResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;
    
    // Validar que el usuario tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to update shifts');
    }
    
    return this.shiftsService.update(id, dto, authenticatedUserMerchantId);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ 
    summary: 'Delete a shift by ID',
    description: 'Deletes a specific shift by its ID. Only merchant administrators can delete shifts from their own merchant. This is a hard delete operation.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number, 
    description: 'Shift ID to delete',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Shift deleted successfully',
    type: ShiftResponseDto,
    schema: {
      example: {
        id: 1,
        merchantId: 1,
        startTime: '2024-01-15T08:00:00Z',
        endTime: '2024-01-15T16:00:00Z',
        role: 'waiter',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z'
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
    description: 'Forbidden - You can only delete shifts from your own merchant',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only delete shifts from your own merchant',
        error: 'Forbidden'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: 'Shift or merchant not found',
    schema: {
      examples: {
        shiftNotFound: {
          summary: 'Shift not found',
          value: {
            statusCode: 404,
            message: 'Shift 999 not found',
            error: 'Not Found'
          }
        },
        merchantNotFound: {
          summary: 'Merchant not found',
          value: {
            statusCode: 404,
            message: 'Merchant with ID 999 not found',
            error: 'Not Found'
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid ID format or value',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid shift ID',
        error: 'Bad Request'
      }
    }
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any
  ): Promise<ShiftResponseDto> {
    // Obtener el merchant_id del usuario autenticado
    const authenticatedUserMerchantId = req.user?.merchant?.id;

    // Validar que el usuario tiene merchant_id
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('User must be associated with a merchant to delete shifts');
    }

    return this.shiftsService.remove(id, authenticatedUserMerchantId);
  }
}
