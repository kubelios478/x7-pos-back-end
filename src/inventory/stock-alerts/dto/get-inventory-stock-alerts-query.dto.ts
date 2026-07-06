import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { InventoryStockAlertStatus } from '../constants/inventory-stock-alert-status.enum';
import { InventoryStockAlertType } from '../constants/inventory-stock-alert-type.enum';

export class GetInventoryStockAlertsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by supply category (CAT 2)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @ApiPropertyOptional({ enum: InventoryStockAlertType })
  @IsOptional()
  @IsEnum(InventoryStockAlertType)
  alertType?: InventoryStockAlertType;

  @ApiPropertyOptional({
    enum: InventoryStockAlertStatus,
    default: InventoryStockAlertStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(InventoryStockAlertStatus)
  status?: InventoryStockAlertStatus;
}
