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
  Query,
} from '@nestjs/common';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';

import { LedgerAccountsService } from './ledger-accounts.service';
import { CreateLedgerAccountDto } from './dto/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from './dto/update-ledger-account.dto';
import { GetLedgerAccountsQueryDto } from './dto/get-ledger-accounts-query.dto';
import { AllPaginatedLedgerAccounts } from './dto/all-paginated-ledger-accounts.dto';
import { OneLedgerAccountResponse } from './dto/ledger-account-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { AccountType } from './constants/account-type.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Core - Financial engine - Ledger accounts')
@ApiExtraModels(ErrorResponse, OneLedgerAccountResponse)
@ApiBearerAuth()
@Controller('ledger-accounts')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.LEDGER_ACCOUNTS)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class LedgerAccountsController {
  constructor(
    private readonly ledgerAccountsService: LedgerAccountsService,
  ) {}

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a new ledger account',
    description:
      "Creates a new ledger account for the authenticated user's company.",
  })
  @ApiCreatedResponse({
    description: 'Ledger account created successfully',
    type: OneLedgerAccountResponse,
    schema: {
      example: {
        statusCode: 201,
        message: 'Ledger Account Created successfully',
        data: {
          id: 1,
          code: '1000',
          name: 'Cash & Bank Accounts',
          type: 'ASSET',
          balance: 0.0,
          status: 'ACTIVE',
          is_active: true,
          parent_account_id: null,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T10:00:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'code must be a string',
        error: 'Bad Request',
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
  @ApiConflictResponse({
    description: 'Ledger account with this code already exists',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: "Ledger account with code '1000' already exists",
        error: 'Conflict',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  @ApiBody({ type: CreateLedgerAccountDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createLedgerAccountDto: CreateLedgerAccountDto,
  ) {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.create(
      merchantId,
      createLedgerAccountDto,
    );
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
  @ApiOperation({
    summary: 'Get all ledger accounts with pagination and filters',
    description:
      'Retrieves a paginated list of ledger accounts. Users can only see accounts from their own company.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'name', required: false, type: String, example: 'Cash' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: AccountType,
    example: AccountType.ASSET,
  })
  @ApiOkResponse({
    description: 'Paginated list of ledger accounts retrieved successfully',
    type: AllPaginatedLedgerAccounts,
    schema: {
      example: {
        statusCode: 200,
        message: 'Ledger accounts retrieved successfully',
        data: [
          {
            id: 1,
            code: '1000',
            name: 'Cash & Bank Accounts',
            type: 'ASSET',
            balance: 1250.0,
            status: 'ACTIVE',
            is_active: true,
            parent_account_id: null,
            created_at: '2026-08-16T10:00:00.000Z',
            updated_at: '2026-08-16T10:00:00.000Z',
            company: {
              id: 1,
              name: 'Acme Corp',
            },
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
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
    description: 'Forbidden',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLedgerAccountsQueryDto,
  ): Promise<AllPaginatedLedgerAccounts> {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.findAll(query, merchantId);
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
  @ApiOperation({
    summary: 'Get a ledger account by ID',
    description:
      'Retrieves details of a single ledger account by its ID, detailing id, code, name, type, balance, status, parent account, and company metadata.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Ledger Account ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Ledger account retrieved successfully',
    type: OneLedgerAccountResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Ledger Account retrieved successfully',
        data: {
          id: 1,
          code: '1000',
          name: 'Cash & Bank Accounts',
          type: 'ASSET',
          balance: 1250.0,
          status: 'ACTIVE',
          is_active: true,
          parent_account_id: null,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T10:00:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Ledger Account ID is incorrect',
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
    description:
      'Forbidden - Insufficient permissions or scope restricted',
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
    description: 'Ledger account not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Ledger Account not found',
        error: 'Not Found',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLedgerAccountResponse> {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.findOne(id, merchantId);
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
  @ApiOperation({
    summary: 'Update a ledger account by ID',
    description:
      'Updates an existing ledger account fields such as code, name, type, or parent account ID.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Ledger Account ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Ledger account updated successfully',
    type: OneLedgerAccountResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Ledger Account Updated successfully',
        data: {
          id: 1,
          code: '1001',
          name: 'Cash on Hand & Petty Cash',
          type: 'ASSET',
          balance: 1250.0,
          status: 'ACTIVE',
          is_active: true,
          parent_account_id: null,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T11:15:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'A ledger account cannot be its own parent',
        error: 'Bad Request',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
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
    description: 'Forbidden',
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
    description: 'Ledger account not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Ledger Account not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Code already in use',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: "Ledger account with code '1001' already exists",
        error: 'Conflict',
      },
    },
  })
  @ApiBody({ type: UpdateLedgerAccountDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLedgerAccountDto: UpdateLedgerAccountDto,
  ): Promise<OneLedgerAccountResponse> {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.update(
      id,
      merchantId,
      updateLedgerAccountDto,
    );
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
  @ApiOperation({
    summary: 'Soft-delete a ledger account by ID',
    description:
      'Soft-deletes an existing ledger account by marking is_active to false.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Ledger Account ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Ledger account deleted successfully',
    type: OneLedgerAccountResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Ledger Account Deleted successfully',
        data: {
          id: 1,
          code: '1000',
          name: 'Cash & Bank Accounts',
          type: 'ASSET',
          balance: 0.0,
          status: 'INACTIVE',
          is_active: false,
          parent_account_id: null,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T12:00:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Ledger Account ID is incorrect',
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
    description:
      'Forbidden - Insufficient permissions (requires MERCHANT_ADMIN role)',
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
    description: 'Ledger account not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Ledger Account not found',
        error: 'Not Found',
      },
    },
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneLedgerAccountResponse> {
    const merchantId = user.merchant.id;
    return this.ledgerAccountsService.remove(id, merchantId);
  }
}

