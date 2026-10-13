//src/commerce/delivery-system/delivery-zone/dto/locate-delivery-zone.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class LocateDeliveryZoneDto {
  @ApiProperty({ example: 18.4662, description: 'Latitude (WGS84)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -69.9384, description: 'Longitude (WGS84)' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}
