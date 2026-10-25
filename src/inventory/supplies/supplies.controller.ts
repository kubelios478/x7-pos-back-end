import {
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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBody,
  ApiParam,
  ApiExtraModels,
  ApiQuery,
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
import { SuppliesService } from './supplies.service';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { SetSupplySuppliersDto } from './dto/set-supply-suppliers.dto';
import { FilterRawMaterialDto } from './dto/filter-raw-material.dto';
import { Supply } from './entities/supply.entity';

@ApiExtraModels(
  ErrorResponse,
  Supply,
  CreateSupplyDto,
  UpdateSupplyDto,
  SetSupplySuppliersDto,
)
@ApiTags('Inventory - Supplies - Raw Materials')
@ApiBearerAuth()
@Controller(['v1/inventory/raw-materials', 'v1/raw-materials', 'supplies'])
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.PRODUCT_MANAGEMENT)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Create a new raw material (Supply)',
    description:
      'Creates a new raw material supply item and provisions initial stock items across merchant storage locations.',
  })
  @ApiBody({ type: CreateSupplyDto })
  @ApiCreatedResponse({
    description: 'Raw material created successfully',
    type: Supply,
    schema: {
      example: {
        id: 1,
        company_id: 1,
        code: 'RAW-FLOUR-01',
        sku: 'FLOUR-1KG',
        name: 'Wheat Flour 1kg',
        category_id: 2,
        unit: 'GRAM',
        purchase_unit: 'kg',
        consumption_unit: 'g',
        conversion_factor: 1000,
        cost_per_unit: 1.5,
        description: 'High grade wheat flour for pizza dough',
        isActive: true,
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or category not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'code is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Raw material code or SKU already exists',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: 'Raw material code/SKU already exists for this company',
        error: 'Conflict',
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
  async create(
    @Body() dto: CreateSupplyDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.create(merchantId, dto);
  }

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary:
      'Paginated list of raw materials with filtering (by category/status)',
    description:
      'Retrieves a paginated list of raw materials filtered by category, status (ACTIVE/INACTIVE), or search string.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'category_id', required: false, type: Number, example: 2 })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'ACTIVE',
  })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Flour' })
  @ApiOkResponse({
    description: 'Paginated list of raw materials retrieved successfully',
    schema: {
      example: {
        items: [
          {
            id: 1,
            company_id: 1,
            code: 'RAW-FLOUR-01',
            sku: 'FLOUR-1KG',
            name: 'Wheat Flour 1kg',
            category_id: 2,
            unit: 'GRAM',
            purchase_unit: 'kg',
            consumption_unit: 'g',
            conversion_factor: 1000,
            cost_per_unit: 1.5,
            description: 'High grade wheat flour for pizza dough',
            isActive: true,
            category: {
              id: 2,
              name: 'Baking Supplies',
              isActive: true,
            },
            created_at: '2024-01-15T10:00:00.000Z',
            updated_at: '2024-01-15T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
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
  async findAll(
    @Query() filter: FilterRawMaterialDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.findAllPaginated(merchantId, filter);
  }

  @Get(':id')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Fetch single raw material details',
    description:
      'Retrieves raw material details by ID including category and supplier associations across legacy and v1 routes.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Raw material ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Raw material details retrieved successfully',
    type: Supply,
    schema: {
      example: {
        id: 1,
        company_id: 1,
        code: 'RAW-FLOUR-01',
        sku: 'FLOUR-1KG',
        name: 'Wheat Flour 1kg',
        category_id: 2,
        unit: 'GRAM',
        purchase_unit: 'kg',
        consumption_unit: 'g',
        conversion_factor: 1000,
        cost_per_unit: 1.5,
        description: 'High grade wheat flour for pizza dough',
        isActive: true,
        category: {
          id: 2,
          name: 'Baking Supplies',
          isActive: true,
        },
        suppliers: [
          {
            id: 10,
            supplier: {
              id: 5,
              name: 'Grand Mills Co.',
            },
          },
        ],
        created_at: '2024-01-15T10:00:00.000Z',
        updated_at: '2024-01-15T10:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input ID or user without merchant',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed (numeric string is expected)',
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
  @ApiNotFoundResponse({
    description: 'Raw material not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Raw material not found',
        error: 'Not Found',
      },
    },
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.findOne(merchantId, id);
  }

  @Put(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Update raw material metadata/units (PUT)',
    description:
      'Updates raw material metadata, purchase/consumption units, or cost per unit.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Raw material ID',
    example: 1,
  })
  @ApiBody({ type: UpdateSupplyDto })
  @ApiOkResponse({
    description: 'Raw material updated successfully',
    type: Supply,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Raw material not found',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async updatePut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplyDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.update(merchantId, id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Update raw material metadata/units (PATCH)',
    description:
      'Updates partial raw material metadata, purchase/consumption units, or cost per unit.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Raw material ID',
    example: 1,
  })
  @ApiBody({ type: UpdateSupplyDto })
  @ApiOkResponse({
    description: 'Raw material updated successfully',
    type: Supply,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Raw material not found',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async updatePatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplyDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.update(merchantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Soft-delete a raw material',
    description:
      'Soft-deletes a raw material by setting isActive to false. Fails if the material is currently referenced in active recipes or stock movements.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Raw material ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Raw material soft-deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Raw material soft-deleted successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Raw material is referenced in active recipes or stock movements',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Cannot delete raw material referenced in active recipes',
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
  @ApiNotFoundResponse({
    description: 'Raw material not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Raw material not found',
        error: 'Not Found',
      },
    },
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.remove(merchantId, id);
  }

  @Post(':id/suppliers')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary: 'Replace raw material suppliers (company-scoped)',
    description: 'Replaces all supplier links associated with a raw material.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Raw material ID',
    example: 1,
  })
  @ApiBody({ type: SetSupplySuppliersDto })
  @ApiOkResponse({
    description: 'Suppliers updated successfully',
    type: Supply,
  })
  @ApiBadRequestResponse({
    description: 'Invalid supplier IDs',
    type: ErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'Raw material not found',
    type: ErrorResponse,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  async setSuppliers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSupplySuppliersDto,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.setSuppliers(
      merchantId,
      id,
      dto.supplierIds,
    );
  }

  @Get(':id/usage')
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(Scope.MERCHANT_WEB, Scope.MERCHANT_ANDROID, Scope.MERCHANT_IOS)
  @ApiOperation({
    summary:
      'Check if raw material is used in active recipes or stock movements',
    description:
      'Checks whether a raw material is referenced across active recipes or recorded stock movements across legacy and v1 routes.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Raw material ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Raw material usage details retrieved successfully',
    schema: {
      example: {
        inRecipes: true,
        inMovements: false,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input ID or user without merchant',
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
  @ApiNotFoundResponse({
    description: 'Raw material not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Raw material not found',
        error: 'Not Found',
      },
    },
  })
  async checkUsage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: ExpressRequest & { user?: AuthenticatedUser },
  ) {
    const merchantId = req.user?.merchant?.id;
    if (!merchantId) throw new BadRequestException('User must have a merchant');
    return await this.suppliesService.checkUsage(merchantId, id);
  }
}
