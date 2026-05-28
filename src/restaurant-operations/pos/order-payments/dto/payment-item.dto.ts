import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PaymentItemDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  method: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;
}
