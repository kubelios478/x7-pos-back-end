import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

export class UpdateMerchantSuscriptionDto {
  @ApiPropertyOptional({ example: 1, description: 'ID del merchant asociado' })
  @IsNumber()
  @IsOptional()
  merchantId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del plan de suscripción',
  })
  @IsNumber()
  @IsOptional()
  planId?: number;

  @ApiPropertyOptional({
    example: '2025-10-07',
    description: 'Fecha de inicio de la suscripción',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-07',
    description: 'Fecha de finalización de la suscripción',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: '2026-09-07',
    description: 'Fecha de renovación de la suscripción',
  })
  @IsDateString()
  @IsOptional()
  renewalDate?: string;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Estado de la suscripción',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    example: 'credit_card',
    description: 'Método de pago utilizado',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
