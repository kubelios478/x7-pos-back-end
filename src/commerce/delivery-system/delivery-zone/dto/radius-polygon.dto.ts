//src/commerce/delivery-system/delivery-zone/dto/radius-polygon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { LocateDeliveryZoneDto } from './locate-delivery-zone.dto';

export class RadiusPolygonDto extends LocateDeliveryZoneDto {
  @ApiProperty({
    example: 3,
    description: 'Radius in kilometers from the center',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(100)
  radius_km: number;

  @ApiPropertyOptional({
    example: 64,
    description: 'Number of vertices of the circle approximation (8-256)',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(256)
  segments?: number;
}
