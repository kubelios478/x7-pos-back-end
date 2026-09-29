import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';

import { Type } from 'class-transformer';

export class CompletePurchaseDto {
  @ApiPropertyOptional({
    example: [1, 2],
    type: [Number],
    description:
      "Merchant tax rule IDs to apply. When omitted or empty, every active tax rule of the order's merchant is applied.",
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  merchantTaxRuleIds?: number[];
}
