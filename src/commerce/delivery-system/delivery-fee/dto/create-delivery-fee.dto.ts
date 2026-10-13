//src/commerce/delivery-system/delivery-fee/dto/create-delivery-fee.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

// decimal(12, 2): 10 dígitos enteros como mucho.
export const DELIVERY_FEE_MAX_AMOUNT = 9999999999.99;
const money = { maxDecimalPlaces: 2 };

export class CreateDeliveryFeeDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Zone related',
  })
  @IsInt()
  @IsPositive()
  deliveryZone: number;

  @ApiProperty({
    example: 5.99,
    description: 'Flat delivery fee (positive, 2 decimals max)',
  })
  @IsNotEmpty()
  @IsNumber(money)
  @IsPositive()
  @Max(DELIVERY_FEE_MAX_AMOUNT)
  base_fee: number;

  @ApiPropertyOptional({
    example: 1.5,
    nullable: true,
    description: 'Charge per kilometer; null or 0 = flat base fee',
  })
  @IsOptional()
  @IsNumber(money)
  @Min(0)
  @Max(DELIVERY_FEE_MAX_AMOUNT)
  per_km_fee?: number | null;

  @ApiPropertyOptional({
    example: 10.99,
    nullable: true,
    description: 'Minimum order subtotal required to accept a delivery',
  })
  @IsOptional()
  @IsNumber(money)
  @Min(0)
  @Max(DELIVERY_FEE_MAX_AMOUNT)
  min_order_amount?: number | null;

  @ApiPropertyOptional({
    example: 50,
    nullable: true,
    description:
      'Order subtotal from which delivery is free; must be greater than min_order_amount',
  })
  @IsOptional()
  @IsNumber(money)
  @Min(0)
  @Max(DELIVERY_FEE_MAX_AMOUNT)
  free_above?: number | null;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'inactive'],
    description: 'Status of the delivery fee',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
