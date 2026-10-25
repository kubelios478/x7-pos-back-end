//src/commerce/delivery-system/delivery-zone/entity/delivery-zone.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { ZoneGeometry } from '../utils/zone-geojson.util';

@Entity({ name: 'delivery_zones' })
export class DeliveryZone {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Zone',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => Merchant,
    example: 1,
    description: 'Identifier of the Merchant related',
  })
  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Centro, Zona Norte',
    description: 'Name of the Delivery Zone',
  })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({
    example: 'description of the delivery zone',
    description: 'Description of the Delivery Zone',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
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
  @Column({ type: 'json', nullable: true })
  geojson: ZoneGeometry | null;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery zone',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
