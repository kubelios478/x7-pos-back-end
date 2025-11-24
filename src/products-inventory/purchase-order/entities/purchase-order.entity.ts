import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Supplier } from 'src/products-inventory/suppliers/entities/supplier.entity';
import { PurchaseOrderItem } from 'src/products-inventory/purchase-order-item/entities/purchase-order-item.entity';
import { PurchaseOrderStatus } from '../constants/purchase-order-status.enum';

@Entity('purchase_order')
export class PurchaseOrder {
  @ApiProperty({ example: 1, description: 'Purchase order ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Merchant ID' })
  @Column({ name: 'merchantId' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.products, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({ example: 1, description: 'Supplier ID' })
  @Column({ name: 'supplierId' })
  supplierId: number;

  @ApiProperty({
    example: '2023-10-26T10:00:00Z',
    description: 'Purchase order date',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'order_date' })
  orderDate: Date;

  @ApiProperty({
    example: PurchaseOrderStatus.PENDING,
    description: 'Purchase order status',
    enum: PurchaseOrderStatus,
  })
  @Column({
    type: 'enum',
    enum: PurchaseOrderStatus,
    default: PurchaseOrderStatus.PENDING,
  })
  status: PurchaseOrderStatus;

  @ApiProperty({
    example: 100.5,
    description: 'Total amount of the purchase order',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @OneToMany(
    () => PurchaseOrderItem,
    (purchaseOrderItem) => purchaseOrderItem.purchaseOrder,
  )
  purchaseOrderItems: PurchaseOrderItem[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
