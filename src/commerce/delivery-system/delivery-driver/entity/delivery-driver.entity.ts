//src/commerce/delivery-system/delivery-driver/entity/delivery-driver.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { VehicleType } from '../constants/delivery-driver.constants';
import { normalizeVehicleType } from '../utils/delivery-driver-normalize.util';

// Compatibilidad hacia atrás: las filas antiguas tienen texto libre ('Car', 'Moto'…). Las
// variantes conocidas se leen y se escriben ya canónicas; lo no reconocido se deja tal cual
// en vez de perderlo. La columna sigue siendo varchar para no romper esas filas.
const vehicleTypeTransformer = {
  to: (value: string | null | undefined) =>
    value == null ? value : (normalizeVehicleType(value) ?? value),
  from: (value: string | null) =>
    value === null ? null : (normalizeVehicleType(value) ?? value),
};

@Entity({ name: 'delivery_drivers' })
export class DeliveryDriver {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Driver',
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
    example: 'Mario Lopez',
    description: 'Name of the Delivery Driver',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: '+18095551234',
    description:
      'Phone number, normalised for tel: links (digits with optional leading +)',
  })
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @ApiProperty({
    enum: VehicleType,
    example: VehicleType.CAR,
    description:
      'Vehicle type: car | motorcycle | bicycle | e_scooter | on_foot (unrecognised legacy values are returned as stored)',
  })
  @Column({ type: 'varchar', length: 50, transformer: vehicleTypeTransformer })
  vehicleType: VehicleType | string;

  @ApiProperty({
    example: 'active',
    description:
      'active | inactive | on_delivery | off_duty | deleted (on_delivery is managed by assignments)',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
