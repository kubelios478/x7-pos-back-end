//src/commerce/delivery-system/delivery-zone/dto/delivery-zone-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ZoneGeometry } from '../utils/zone-geojson.util';

export class DeliveryZoneResponseDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Delivery Zone' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Centro, Zona Norte',
    description: 'Name of the Delivery Zone',
  })
  name: string;

  @ApiProperty({
    example: 'description of the delivery zone',
    description: 'Description of the Delivery Zone',
  })
  description: string | null;

  @ApiProperty({
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
    nullable: true,
    description:
      'GeoJSON Polygon or MultiPolygon ([lng, lat] order) defining the delivery zone area',
  })
  geojson: ZoneGeometry | null;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  status: string;
}

export class OneDeliveryZoneResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryZoneResponseDto;
}

export class AllDeliveryZoneResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryZoneResponseDto[];
}
