import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from '../../orders/entities/order.entity';

@Entity('order_taxes')
export class OrderTax {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'order_id' })
  order_id: number;

  @ManyToOne(() => Order, (order) => order.orderTaxes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ example: 'IVA', description: 'IVA, Service Tax, etc.' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: 0.19,
    description:
      'Tax rate as stored on the merchant tax rule (decimal fraction for PERCENTAGE/COMPOUND, monetary amount for FIXED)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate: number;

  @ApiProperty({ example: 3.5 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
