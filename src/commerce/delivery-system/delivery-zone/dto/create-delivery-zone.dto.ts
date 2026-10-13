//src/commerce/delivery-system/delivery-zone/dto/create-delivery-zone.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  DELIVERY_ZONE_DESCRIPTION_MAX,
  DELIVERY_ZONE_NAME_MAX,
  DELIVERY_ZONE_STATUSES,
} from '../constants/delivery-zone.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateDeliveryZoneDto {
  // El comercio sale SIEMPRE del JWT. El campo se sigue aceptando (y se ignora) para no
  // romper a los clientes que ya lo mandan con `forbidNonWhitelisted` activo.
  @ApiPropertyOptional({
    example: 1,
    description:
      'Ignored: the merchant is taken from the authenticated user. Kept for backwards compatibility.',
  })
  @IsOptional()
  @IsInt()
  merchant?: number;

  @ApiProperty({
    example: 'Centro, Zona Norte',
    description: 'Name of the Delivery Zone',
    maxLength: DELIVERY_ZONE_NAME_MAX,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(DELIVERY_ZONE_NAME_MAX)
  name: string;

  @ApiPropertyOptional({
    example: 'Downtown blocks north of the main avenue',
    description: 'Description of the Delivery Zone',
    maxLength: DELIVERY_ZONE_DESCRIPTION_MAX,
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(DELIVERY_ZONE_DESCRIPTION_MAX)
  description?: string | null;

  @ApiPropertyOptional({
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [-69.94, 18.47],
          [-69.92, 18.47],
          [-69.92, 18.45],
          [-69.94, 18.47],
        ],
      ],
    },
    description:
      'GeoJSON Polygon, MultiPolygon or Feature (object or JSON string). Rings must be closed. null clears the boundary.',
  })
  @IsOptional()
  geojson?: unknown;

  @ApiProperty({
    example: 'active',
    enum: DELIVERY_ZONE_STATUSES,
    description: 'Status of the delivery zone',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(DELIVERY_ZONE_STATUSES)
  status: string;
}
