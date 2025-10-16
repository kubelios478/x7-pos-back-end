import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateMerchSubDto {
  @ApiProperty({ example: 1, description: 'ID del merchant asociado' })
  @IsNumber()
  @IsNotEmpty()
  merchantId: number;

  @ApiProperty({ example: 2, description: 'ID del plan de suscripción' })
  @IsNumber()
  @IsNotEmpty()
  planId: number;

  @ApiProperty({
    example: '2025-10-07',
    description: 'Fecha de inicio de la suscripción',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ example: '2026-10-07', required: false })
  @IsDateString()
  @IsOptional()
  endDate: Date;

  @ApiProperty({ example: '2025-11-07', required: false })
  @IsDateString()
  @IsOptional()
  renewalDate?: Date;

  @ApiProperty({ example: 'active', description: 'Estado de la suscripción' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    example: 'credit_card',
    description: 'Método de pago utilizado',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
