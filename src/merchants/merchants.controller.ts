// src/companies/companies.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Put,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dtos/create-merchant.dto';
import { UpdateMerchantDto } from './dtos/update-merchant.dto';
import { Merchant } from './entities/merchant.entity';
import { ErrorResponse } from '../common/dtos/error-response.dto';

@ApiTags('Merchants')
@ApiExtraModels(ErrorResponse)
@ApiBearerAuth()
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Merchant' })
  @ApiResponse({
    status: 201,
    description: 'Merchant created successfully',
    type: Merchant,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 400,
        message: ['name must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  @ApiBody({ type: CreateMerchantDto })
  create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({
    status: 200,
    description: 'List of companies',
    type: [Merchant],
  })
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
  findAll() {
    return this.merchantsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Merchant by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiResponse({ status: 200, description: 'Merchant found', type: Merchant })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a Merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiBody({ type: UpdateMerchantDto })
  @ApiResponse({ status: 200, description: 'Merchant updated', type: Merchant })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
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
        message: ['name must be longer than or equal to 2 characters'],
        error: 'Bad Request',
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Merchant ID' })
  @ApiResponse({ status: 200, description: 'Merchant deleted' })
  @ApiResponse({
    status: 404,
    description: 'Merchant not found',
    type: ErrorResponse,
    schema: {
      example: {
        statusCode: 404,
        message: 'Merchant not found',
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.remove(id);
  }
}
