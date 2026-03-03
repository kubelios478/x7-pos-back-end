import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsPositive, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateReceiptDto {
  @ApiProperty({ example: 200, description: 'Order ID associated to the receipt' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  orderId: number;

  @ApiProperty({ example: 'invoice', description: 'Type of receipt' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiProperty({ 
    example: '{"tax_id": "12345678", "fiscal_number": "ABC123"}', 
    description: 'Fiscal data in JSON format',
    required: false 
  })
  @IsString()
  @IsOptional()
  fiscalData?: string;
}
