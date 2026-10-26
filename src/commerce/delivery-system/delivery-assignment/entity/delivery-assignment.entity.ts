//src/commerce/delivery-system/delivery-assignment/entity/delivery-assignment.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryDriver } from 'src/commerce/delivery-system/delivery-driver/entity/delivery-driver.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { AssignmentType } from '../constants/assignment-type.enum';

// Postgres devuelve `decimal` como cadena; mismo transformer que delivery-fee.entity.ts.
const decimalToNumber = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

// El webhook de un DSP localiza la asignación por (proveedor, id externo): tiene que ser único.
@Index(
  'uq_delivery_assignments_external_delivery',
  ['assignment_type', 'external_delivery_id'],
  { unique: true, where: '"external_delivery_id" IS NOT NULL' },
)
@Entity({ name: 'delivery_assignments' })
export class DeliveryAssignment {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Assignment',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => Order,
    example: 1,
    description: 'Identifier of the Order related',
  })
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  // Nulo mientras está PENDING y siempre en los repartos de un DSP (su repartidor no es nuestro).
  @ApiPropertyOptional({
    type: () => DeliveryDriver,
    nullable: true,
    description: 'Delivery Driver (in-house only)',
  })
  @ManyToOne(() => DeliveryDriver, { nullable: true })
  @JoinColumn({ name: 'delivery_driver_id' })
  deliveryDriver: DeliveryDriver | null;

  @ApiProperty({
    enum: AssignmentType,
    example: AssignmentType.IN_HOUSE,
    description: 'Who performs the delivery',
  })
  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.IN_HOUSE,
  })
  assignment_type: AssignmentType;

  @ApiProperty({
    enum: DeliveryStatus,
    example: DeliveryStatus.ASSIGNED,
    description: 'Delivery lifecycle status',
  })
  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  delivery_status: DeliveryStatus;

  @ApiPropertyOptional({
    example: '2024-06-01T12:00:00Z',
    description: 'Set by the server when a driver/runner is bound (ASSIGNED)',
  })
  @Column({ type: 'timestamp', nullable: true })
  assigned_at: Date | null;

  @ApiPropertyOptional({
    example: '2024-06-01T12:15:00Z',
    description: 'Set by the server on PICKED_UP',
  })
  @Column({ type: 'timestamp', nullable: true })
  picked_up_at: Date | null;

  @ApiPropertyOptional({
    example: '2024-06-01T12:30:00Z',
    description: 'Set by the server on DELIVERED',
  })
  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date | null;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-dsp',
    description: 'Delivery id at the DSP (DSP assignments only)',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  external_delivery_id: string | null;

  @ApiPropertyOptional({
    example: 'https://track.example.com/a1b2c3d4',
    description: 'Public tracking URL from the DSP',
  })
  @Column({ type: 'varchar', length: 2048, nullable: true })
  external_tracking_url: string | null;

  @ApiPropertyOptional({
    example: 7.5,
    description: 'Fee charged by the DSP',
  })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  external_dsp_fee: number | null;

  @ApiProperty({
    example: 'active',
    description: 'Logical status of the record (active, inactive, deleted)',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
