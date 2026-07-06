import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCashMovementDto {
  @ApiProperty({
    description: 'Expense amount',
    example: 50.0,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Reason or description for the expense (e.g. Cleaning, Supplier)',
    example: 'Branch office cleaning payment',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description: 'URL or receipt/payment voucher photo',
    example: 'https://comprobantes.s3.amazonaws.com/recibo123.jpg',
  })
  @IsString()
  @IsOptional()
  receiptPhoto?: string;
}
