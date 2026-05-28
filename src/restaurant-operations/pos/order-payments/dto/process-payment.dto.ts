import {
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
  Length,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';
import { PaymentItemDto } from './payment-item.dto';

export class ProcessPaymentDto {
  @IsNumber()
  orderId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];

  @IsString()
  source: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  merchantTipRuleId?: number;

  @IsString()
  @Length(3, 3)
  currency: string;
}
