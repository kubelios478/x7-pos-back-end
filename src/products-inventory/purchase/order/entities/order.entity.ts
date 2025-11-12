import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Supplier } from '../../../suppliers/entities/supplier.entity';
import { OrderItem } from 'src/products-inventory/purchase/order-item/entities/order-item.entity';

@Entity('purchase_orders') // Nombre de tabla para evitar conflicto con la entidad Order principal
export class Order {
  @ApiProperty({ example: 1, description: 'ID de la orden de compra' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID del comerciante' })
  @Index()
  @Column({ name: 'merchant_id' })
  merchantId: number;

  @ApiProperty({ example: 1, description: 'ID del proveedor' })
  @Index()
  @Column({ name: 'supplier_id' })
  supplierId: number;

  @ApiProperty({
    example: '2023-10-26T10:00:00Z',
    description: 'Fecha de la orden de compra',
  })
  @Column({ type: 'timestamp', name: 'order_date' })
  orderDate: Date;

  @ApiProperty({
    example: 'pending',
    description: 'Estado de la orden de compra',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @ApiProperty({
    example: 100.5,
    description: 'Monto total de la orden de compra',
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseOrders)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems: OrderItem[];
}
