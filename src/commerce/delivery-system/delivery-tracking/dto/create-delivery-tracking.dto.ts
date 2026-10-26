//src/commerce/delivery-system/delivery-tracking/dto/create-delivery-tracking.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { TRACKING_STATUSES } from '../constants/delivery-tracking.constants';

export class CreateDeliveryTrackingDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Assignment',
  })
  @IsInt()
  @IsPositive()
  deliveryAssignment: number;

  @ApiProperty({
    example: 37.7749,
    description: 'Current latitude of the delivery driver (WGS84)',
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    example: -122.4194,
    description: 'Current longitude of the delivery driver (WGS84)',
  })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  longitude: number;

  // Sin `@Type` el ISO que llega en el JSON es una cadena y `@IsDate` lo rechazaba siempre.
  @ApiPropertyOptional({
    example: '2024-06-01T12:00:00Z',
    description:
      'Time when the location was recorded on the device (default: now)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  recorded_at?: Date;

  @ApiPropertyOptional({
    example: 'active',
    enum: TRACKING_STATUSES,
    description: 'Status of the tracking stream (default: active)',
  })
  @IsOptional()
  @IsIn([...TRACKING_STATUSES])
  status?: string;
}
