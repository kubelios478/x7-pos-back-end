import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Request as ExpressRequest } from 'express';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { ItemsService } from '../products-inventory/stocks/items/items.service';
import { LocationsService } from '../products-inventory/stocks/locations/locations.service';
import { CreateLocationDto } from '../products-inventory/stocks/locations/dto/create-location.dto';
import { UpdateLocationDto } from '../products-inventory/stocks/locations/dto/update-location.dto';
import { GetLocationsQueryDto } from '../products-inventory/stocks/locations/dto/get-locations-query.dto';
import { GetItemsQueryDto } from '../products-inventory/stocks/items/dto/get-items-query.dto';
import { MovementsService } from '../products-inventory/stocks/movements/movements.service';
import { CreateMovementDto } from '../products-inventory/stocks/movements/dto/create-movement.dto';
import { GetMovementsQueryDto } from '../products-inventory/stocks/movements/dto/get-movements-query.dto';
import { OneMovementResponse } from '../products-inventory/stocks/movements/dto/movement-response.dto';
import { DepleteFromOrderDto } from './dto/deplete-from-order.dto';

@ApiExtraModels(ErrorResponse, OneMovementResponse, CreateMovementDto, DepleteFromOrderDto)
@ApiTags('Inventory - Supplies - Raw Material Stock')
@ApiBearerAuth()
@Controller('v1/raw-material-stock')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.STOCK_AND_STOCK_MOVEMENTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class RawMaterialStockController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly locationsService: LocationsService,
    private readonly movementsService: MovementsService,
  ) {}

  @Get('items')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Get stock balance per raw material and location',
    description: 'Retrieves current stock balances for raw materials across storage locations.',
  })
  @ApiQuery({ name: 'locationId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'supplyId', required: false, type: Number, example: 5 })
  @ApiOkResponse({
    description: 'Stock items retrieved successfully',
  })
  @ApiBadRequestResponse({
    description: 'User must have a merchant',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'User must have a merchant',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - Insufficient permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  async getStockItems(
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
    @Query()
    query: GetItemsQueryDto & { locationId?: number; supplyId?: number },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');

    return await this.itemsService.findAll(
      {
        ...query,
      },
      merchantId,
    );
  }

  @Post('locations')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Create storage location',
    description: 'Creates a new storage location for raw material inventory.',
  })
  @ApiBody({ type: CreateLocationDto })
  @ApiCreatedResponse({
    description: 'Storage location created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async createLocation(
    @Body() dto: CreateLocationDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.locationsService.create(merchantId, dto);
  }

  @Get('locations')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'List all storage locations',
    description: 'Retrieves all storage locations belonging to the merchant.',
  })
  @ApiOkResponse({ description: 'List of storage locations' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async listLocations(
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
    @Query() query: GetLocationsQueryDto,
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.locationsService.findAll(query, merchantId);
  }

  @Get('locations/:id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Get details for a specific storage location' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Storage location details' })
  @ApiNotFoundResponse({ description: 'Storage location not found', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async getOneLocation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.locationsService.findOne(id, merchantId);
  }

  @Patch('locations/:id')
  @Put('locations/:id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Update storage location' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateLocationDto })
  @ApiOkResponse({ description: 'Storage location updated successfully' })
  @ApiNotFoundResponse({ description: 'Storage location not found', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.locationsService.update(id, merchantId, dto);
  }

  @Delete('locations/:id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({ summary: 'Soft-delete or deactivate a storage location' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ description: 'Storage location soft-deleted successfully' })
  @ApiNotFoundResponse({ description: 'Storage location not found', type: ErrorResponse })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async deleteLocation(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.locationsService.remove(id, merchantId);
  }

  @Post('movements')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Record a manual stock entry, adjustment, or waste log',
    description:
      'Records stock movements including manual entries (IN), waste logs (OUT), adjustments, or location transfers for raw materials.',
  })
  @ApiBody({
    type: CreateMovementDto,
    schema: {
      example: {
        stockItemId: 1,
        quantity: 25,
        type: 'IN',
        movementType: 'ADJUSTMENT',
        reason: 'Stock reconciliation adjustment',
        reference: 'ADJ-2024-001',
        sourceLocationId: 1,
        destinationLocationId: 2,
        unitCost: 12.5,
        supplyId: 5,
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Stock movement recorded successfully',
    type: OneMovementResponse,
    schema: {
      example: {
        statusCode: 201,
        message: 'Movement Created successfully',
        data: {
          id: 101,
          item: {
            id: 1,
            name: 'Flour 1kg',
          },
          quantity: 25,
          type: 'IN',
          movementType: 'ADJUSTMENT',
          reason: 'Stock reconciliation adjustment',
          reference: 'ADJ-2024-001',
          sourceLocationId: 1,
          sourceLocationName: 'Main Warehouse',
          destinationLocationId: 2,
          destinationLocationName: 'Kitchen Storage',
          unitCost: '12.50',
          createdBy: 'Inventory Clerk',
          createdAt: '2024-01-15T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or negative quantity',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'quantity must be greater than or equal to 0',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User must be associated with a merchant or lacks role permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'User must have a merchant',
        error: 'Forbidden',
      },
    },
  })
  async recordMovement(
    @Body()
    dto: CreateMovementDto & {
      sourceLocationId?: number;
      destinationLocationId?: number;
      createdBy?: string;
      movementType?: string;
    },
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');

    // Assign the creator user by default
    const userName = req.user?.email || 'Inventory Clerk';
    dto.createdBy = dto.createdBy || userName;

    return await this.movementsService.create(merchantId, dto);
  }

  @Post('movements/deplete-from-order')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary:
      'Internal/Service endpoint to process recipe-driven stock depletion from sales orders',
    description:
      'Processes automatic raw material recipe depletion based on items in a fulfilled sales order.',
  })
  @ApiBody({
    type: DepleteFromOrderDto,
    schema: {
      example: {
        orderId: 42,
      },
    },
  })
  @ApiOkResponse({
    description: 'Stock depleted successfully from sales order',
    schema: {
      example: {
        statusCode: 200,
        message: 'Stock depleted successfully from order',
        data: {
          success: true,
          movementsCount: 3,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Missing orderId or invalid input',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Must provide orderId',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Missing or invalid authentication token',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden - User must be associated with a merchant or lacks role permissions',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Sales order not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Order with ID 42 not found',
        error: 'Not Found',
      },
    },
  })
  async depleteFromOrder(
    @Body() body: DepleteFromOrderDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    if (!body.orderId) throw new BadRequestException('Must provide orderId');

    return await this.movementsService.depleteFromOrder(
      merchantId,
      body.orderId,
    );
  }

  @Get('movements')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Audit history of stock movements with date/type filters',
    description:
      'Retrieves historical log of raw material stock movements with filtering capabilities.',
  })
  @ApiOkResponse({ description: 'Historical list of stock movements' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async auditHistory(
    @Query() query: GetMovementsQueryDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');

    return await this.movementsService.findAll(query, merchantId);
  }
}
