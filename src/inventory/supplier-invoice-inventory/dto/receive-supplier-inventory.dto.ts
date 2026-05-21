import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class ReceiveSupplierInventoryDto {
  @ApiPropertyOptional({
    description:
      'Stock location for receipt; defaults to merchant default sales stock location',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  locationId?: number;
}
