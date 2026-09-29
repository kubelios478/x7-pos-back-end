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

import { JournalEntryService } from './journal-entry.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { GetJournalEntriesQueryDto } from './dto/get-journal-entries-query.dto';
import { AllPaginatedJournalEntries } from './dto/all-paginated-journal-entries.dto';
import { OneJournalEntryResponse } from './dto/journal-entry-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { JournalEntryStatus } from './constants/journal-entry-status.enum';
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
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Core - Financial engine - Journal Entry')
@ApiExtraModels(ErrorResponse, OneJournalEntryResponse)
@ApiBearerAuth()
@Controller(['journal-entry', 'journal-entries'])
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.JOURNAL_ENTRIES)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class JournalEntryController {
  constructor(private readonly journalEntryService: JournalEntryService) {}

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
    summary: 'Create a new journal entry',
    description:
      'Creates a balanced journal entry. Total debit must equal total credit across all lines. Only DRAFT status entries can be edited or deleted.',
  })
  @ApiCreatedResponse({
    description: 'Journal entry created successfully',
    type: OneJournalEntryResponse,
    schema: {
      example: {
        statusCode: 201,
        message: 'Journal Entry Created successfully',
        data: {
          id: 1,
          entry_number: 'JE-2026-004',
          entry_date: '2026-08-16T00:00:00.000Z',
          description: 'Physical Inventory Audit Adjustment - Main Storage Hub',
          status: 'DRAFT',
          total_debit: 150.0,
          total_credit: 150.0,
          is_balanced: true,
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T10:00:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
          lines: [
            {
              id: 1,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 150.0,
              credit: 0.0,
              description:
                'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
            },
            {
              id: 2,
              account: {
                id: 15,
                code: '5100',
                name: 'Inventory Adjustment Variance',
              },
              debit: 0.0,
              credit: 150.0,
              description: 'Physical count variance adjustment gain credit',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input or unbalanced entry (debit ≠ credit)',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message:
          'Journal entry is not balanced: total debit (150) ≠ total credit (100)',
        error: 'Bad Request',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Entry number already exists',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: "Journal entry with number 'JE-2026-004' already exists",
        error: 'Conflict',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Company or ledger account not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Ledger account with ID 99 not found or inactive',
        error: 'Not Found',
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
  @ApiBody({ type: CreateJournalEntryDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createJournalEntryDto: CreateJournalEntryDto,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.create(merchantId, createJournalEntryDto);
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
    summary: 'Get all journal entries with pagination and filters',
    description: "Retrieves paginated journal entries for the user's company.",
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: JournalEntryStatus })
  @ApiQuery({
    name: 'reference_type',
    required: false,
    type: String,
    example: 'ORDER',
  })
  @ApiOkResponse({
    description: 'Paginated list of journal entries retrieved successfully',
    type: AllPaginatedJournalEntries,
    schema: {
      example: {
        statusCode: 200,
        message: 'Journal entries retrieved successfully',
        data: [
          {
            id: 1,
            entry_number: 'JE-2026-004',
            entry_date: '2026-08-16T00:00:00.000Z',
            description:
              'Physical Inventory Audit Adjustment - Main Storage Hub',
            status: 'DRAFT',
            total_debit: 150.0,
            total_credit: 150.0,
            is_balanced: true,
            reference_type: 'ADJUSTMENT',
            reference_id: 15,
            created_at: '2026-08-16T10:00:00.000Z',
            updated_at: '2026-08-16T10:00:00.000Z',
            company: {
              id: 1,
              name: 'Acme Corp',
            },
            lines: [
              {
                id: 1,
                account: {
                  id: 2,
                  code: '1100',
                  name: 'Raw Material Inventory',
                },
                debit: 150.0,
                credit: 0.0,
                description:
                  'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
              },
              {
                id: 2,
                account: {
                  id: 15,
                  code: '5100',
                  name: 'Inventory Adjustment Variance',
                },
                debit: 0.0,
                credit: 150.0,
                description: 'Physical count variance adjustment gain credit',
              },
            ],
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
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetJournalEntriesQueryDto,
  ): Promise<AllPaginatedJournalEntries> {
    const merchantId = user.merchant.id;
    return this.journalEntryService.findAll(query, merchantId);
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
    summary: 'Get a journal entry by ID (includes all lines)',
    description:
      'Retrieves a single journal entry by its ID, including all debit and credit lines, account details, and company information.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the journal entry',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Journal entry retrieved successfully',
    type: OneJournalEntryResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Journal Entry retrieved successfully',
        data: {
          id: 1,
          entry_number: 'JE-2026-004',
          entry_date: '2026-08-16T00:00:00.000Z',
          description:
            'Physical Inventory Audit Adjustment - Main Storage Hub',
          status: 'DRAFT',
          total_debit: 150.0,
          total_credit: 150.0,
          is_balanced: true,
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T10:00:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
          lines: [
            {
              id: 1,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 150.0,
              credit: 0.0,
              description:
                'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
            },
            {
              id: 2,
              account: {
                id: 15,
                code: '5100',
                name: 'Inventory Adjustment Variance',
              },
              debit: 0.0,
              credit: 150.0,
              description: 'Physical count variance adjustment gain credit',
            },
          ],
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
        message: 'Journal Entry ID is incorrect',
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
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal Entry not found',
        error: 'Not Found',
      },
    },
  })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OneJournalEntryResponse> {
    const merchantId = user.merchant.id;
    return this.journalEntryService.findOne(id, merchantId);
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
    summary: 'Update a journal entry (only DRAFT entries)',
    description:
      'Updates a journal entry. Only allowed for entries in DRAFT status. If lines are provided, they fully replace the existing lines and must be balanced.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the journal entry to update',
    example: 1,
  })
  @ApiBody({
    type: UpdateJournalEntryDto,
    description:
      'Journal entry payload to update draft entry and replace lines if provided',
    examples: {
      draftUpdate: {
        summary: 'Update draft entry fields and lines',
        value: {
          entry_number: 'JE-2026-004-REV',
          entry_date: '2026-08-16',
          description: 'Updated Physical Inventory Audit Adjustment',
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          lines: [
            {
              account_id: 2,
              debit: 200.0,
              credit: 0.0,
              description: 'Revised physical count adjustment (+6 units)',
            },
            {
              account_id: 15,
              debit: 0.0,
              credit: 200.0,
              description: 'Revised variance gain credit',
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Journal entry updated successfully',
    type: OneJournalEntryResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Journal Entry Updated successfully',
        data: {
          id: 1,
          entry_number: 'JE-2026-004-REV',
          entry_date: '2026-08-16T00:00:00.000Z',
          description: 'Updated Physical Inventory Audit Adjustment',
          status: 'DRAFT',
          total_debit: 200.0,
          total_credit: 200.0,
          is_balanced: true,
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T11:30:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
          lines: [
            {
              id: 3,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 200.0,
              credit: 0.0,
              description: 'Revised physical count adjustment (+6 units)',
            },
            {
              id: 4,
              account: {
                id: 15,
                code: '5100',
                name: 'Inventory Adjustment Variance',
              },
              debit: 0.0,
              credit: 200.0,
              description: 'Revised variance gain credit',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input, unbalanced entry, or not in DRAFT status',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Only DRAFT journal entries can be updated',
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
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal Entry not found',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Entry number already in use',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 409,
        message: "Journal entry with number 'JE-2026-004-REV' already exists",
        error: 'Conflict',
      },
    },
  })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateJournalEntryDto: UpdateJournalEntryDto,
  ): Promise<OneJournalEntryResponse> {
    const merchantId = user.merchant.id;
    return this.journalEntryService.update(
      id,
      merchantId,
      updateJournalEntryDto,
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
    summary: 'Delete a journal entry (only DRAFT entries)',
    description:
      'Permanently deletes a journal entry and all its lines. Only allowed for entries in DRAFT status.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({
    description: 'Journal entry deleted successfully',
    schema: {
      example: {
        statusCode: 200,
        message: 'Journal Entry deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal Entry not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid ID or entry is not in DRAFT status',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Only DRAFT journal entries can be deleted',
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
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.remove(id, merchantId);
  }

  @Post(':id/post')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Post a journal entry (change status from DRAFT to POSTED)',
    description:
      'Validates and posts a journal entry. Once posted, it cannot be modified or deleted.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({
    description: 'Journal entry posted successfully',
    type: OneJournalEntryResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Journal Entry Updated successfully',
        data: {
          id: 1,
          entry_number: 'JE-2026-004',
          entry_date: '2026-08-16T00:00:00.000Z',
          description:
            'Physical Inventory Audit Adjustment - Main Storage Hub',
          status: 'POSTED',
          total_debit: 150.0,
          total_credit: 150.0,
          is_balanced: true,
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T11:45:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
          lines: [
            {
              id: 1,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 150.0,
              credit: 0.0,
              description:
                'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
            },
            {
              id: 2,
              account: {
                id: 15,
                code: '5100',
                name: 'Inventory Adjustment Variance',
              },
              debit: 0.0,
              credit: 150.0,
              description: 'Physical count variance adjustment gain credit',
            },
          ],
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal Entry not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Journal entry is already posted or unbalanced',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Journal entry is already posted',
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
  post(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.post(id, merchantId);
  }

  @Post(':id/void')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary:
      'Void a posted journal entry (change status from POSTED to VOIDED)',
    description:
      'Voids a journal entry. Only posted entries can be voided. This is used for audit purposes instead of deleting records.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({
    description: 'Journal entry voided successfully',
    type: OneJournalEntryResponse,
    schema: {
      example: {
        statusCode: 200,
        message: 'Journal Entry Voided successfully',
        data: {
          id: 1,
          entry_number: 'JE-2026-004',
          entry_date: '2026-08-16T00:00:00.000Z',
          description:
            'Physical Inventory Audit Adjustment - Main Storage Hub',
          status: 'VOIDED',
          total_debit: 150.0,
          total_credit: 150.0,
          is_balanced: true,
          reference_type: 'ADJUSTMENT',
          reference_id: 15,
          created_at: '2026-08-16T10:00:00.000Z',
          updated_at: '2026-08-16T12:00:00.000Z',
          company: {
            id: 1,
            name: 'Acme Corp',
          },
          lines: [
            {
              id: 1,
              account: {
                id: 2,
                code: '1100',
                name: 'Raw Material Inventory',
              },
              debit: 150.0,
              credit: 0.0,
              description:
                'Physical count adjustment: System count 10 -> Actual count 15 (+5 units)',
            },
            {
              id: 2,
              account: {
                id: 15,
                code: '5100',
                name: 'Inventory Adjustment Variance',
              },
              debit: 0.0,
              credit: 150.0,
              description: 'Physical count variance adjustment gain credit',
            },
          ],
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Journal entry not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Journal Entry not found',
        error: 'Not Found',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Only posted entries can be voided',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: 'Journal Entry is already voided',
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
  void(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const merchantId = user.merchant.id;
    return this.journalEntryService.void(id, merchantId);
  }
}

