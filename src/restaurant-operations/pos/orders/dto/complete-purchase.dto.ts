import { IsArray, IsInt, IsOptional } from 'class-validator';

import { Type } from 'class-transformer';

export class CompletePurchaseDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  merchantTaxRuleIds?: number[];
}
