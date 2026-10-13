//src/commerce/delivery-system/delivery-fee/dto/quote-delivery-fee.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { DELIVERY_FEE_MAX_AMOUNT } from './create-delivery-fee.dto';

export class QuoteDeliveryFeeDto {
  @ApiProperty({ example: 1, description: 'Delivery zone of the customer' })
  @IsInt()
  @IsPositive()
  delivery_zone_id: number;

  @ApiProperty({ example: 24.5, description: 'Order subtotal' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(DELIVERY_FEE_MAX_AMOUNT)
  subtotal: number;

  @ApiPropertyOptional({
    example: 3.2,
    description: 'Distance from the store to the customer, in km',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  distance_km?: number;
}
