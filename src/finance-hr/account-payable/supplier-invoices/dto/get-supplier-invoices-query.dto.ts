import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { SupplierInvoiceStatus } from '../constants/supplier-invoice-status.enum';

export enum SupplierInvoiceSortBy {
  CREATED_AT = 'created_at',
  INVOICE_DATE = 'invoice_date',
  DUE_DATE = 'due_date',
  TOTAL_AMOUNT = 'total_amount',
  STATUS = 'status',
}

export class GetSupplierInvoicesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by company ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  company_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by supplier ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  supplier_id?: number;

  @ApiPropertyOptional({
    example: SupplierInvoiceStatus.PENDING,
    enum: SupplierInvoiceStatus,
  })
  @IsOptional()
  @IsEnum(SupplierInvoiceStatus)
  status?: SupplierInvoiceStatus;

  @ApiPropertyOptional({
    example: SupplierInvoiceSortBy.CREATED_AT,
    enum: SupplierInvoiceSortBy,
  })
  @IsOptional()
  @IsEnum(SupplierInvoiceSortBy)
  sortBy?: SupplierInvoiceSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    example: false,
    description: 'When true, list only soft-deleted (archived) invoices',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  only_deleted?: boolean;
}
