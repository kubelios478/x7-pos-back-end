import {
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  IsBoolean,
} from 'class-validator';

export class RefundOrderDto {
  @IsNumber()
  orderId: number;

  @IsOptional()
  @IsArray()
  itemIds?: number[];

  @IsOptional()
  @IsBoolean()
  fullRefund?: boolean;

  @IsString()
  reason: string;
}
