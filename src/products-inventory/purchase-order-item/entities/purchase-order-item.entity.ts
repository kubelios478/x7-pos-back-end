import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrder } from 'src/products-inventory/purchase-order/entities/purchase-order.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';

@Entity('purchase_order_item')
export class PurchaseOrderItem {
  @ApiProperty({ example: 1, description: 'Purchase order item ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Associated purchase order ID' })
  @Column({ name: 'purchaseOrderId' })
  purchaseOrderId: number;

  @ApiProperty({ example: 1, description: 'Product ID' })
  @Column({ name: 'productId' })
  productId: number;

  @ApiProperty({ example: 1, description: 'Product variant ID' })
  @Column({ name: 'variantId', nullable: true })
  variantId: number;

  @ApiProperty({ example: 5, description: 'Product quantity' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ example: 10.5, description: 'Product unit price' })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unitPrice' })
  unitPrice: number;

  @ApiProperty({ example: 52.5, description: 'Total item price' })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'totalPrice' })
  totalPrice: number;

  @ManyToOne(
    () => PurchaseOrder,
    (purchaseOrder) => purchaseOrder.purchaseOrderItems,
    {
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ManyToOne(() => Variant, (variant) => variant.purchaseOrderItems, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'variantId' })
  variant: Variant;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
