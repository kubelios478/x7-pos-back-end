import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { ReceiptStatus } from '../constants/receipt-status.enum';
import { Order } from '../../orders/entities/order.entity';

@Entity('receipts')
export class Receipt {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 200, description: 'Order ID associated to the receipt' })
  @Column({ type: 'int', name: 'order_id' })
  order_id: number;

  @ApiProperty({ example: 'invoice', description: 'Type of receipt' })
  @Column({ type: 'varchar', length: 50 })
  type: string;

  @ApiProperty({ example: '{"tax_id": "12345678", "fiscal_number": "ABC123"}', description: 'Fiscal data in JSON format' })
  @Column({ type: 'text', nullable: true })
  fiscal_data?: string | null;

  @ApiProperty({ example: 'active', enum: ReceiptStatus, description: 'Logical status' })
  @Column({ type: 'enum', enum: ReceiptStatus, default: ReceiptStatus.ACTIVE })
  status: ReceiptStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => Order,
    required: false,
    description: 'Order associated with this receipt',
  })
  @ManyToOne(() => Order, (order) => order.receipts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
