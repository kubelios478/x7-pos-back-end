import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderPaymentDto {
  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  orderId: number;

  @ApiProperty({
    example: 5,
    description: 'ID of the collaborator processing the payment',
  })
  @IsNumber()
  @IsPositive()
  collaboratorId: number;

  @ApiProperty({ example: 50.25 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'card', description: 'cash, card, online, qr, etc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  method: string;

  @ApiPropertyOptional({
    example: 123,
    description:
      'Required when method is loyalty. A server-side lock id created via POST /loyalty-points-redemption/locks.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  loyaltyPointsLockId?: number;

  @ApiPropertyOptional({ example: 'stripe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  provider?: string;

  @ApiPropertyOptional({ example: 'ch_abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRefund?: boolean;

  @ApiPropertyOptional({ example: 'mobile_app' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Optional POS shift id for inventory kardex linkage',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  shiftId?: number;
}
