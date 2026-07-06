// src/merchants/dtos/update-merchant.dto.ts
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateMerchantDto } from './create-merchant.dto';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Default stock location used for POS sale deductions and stock availability flags',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultSalesStockLocationId?: number | null;
}
