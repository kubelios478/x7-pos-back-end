import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from 'src/products-inventory/purchase/order/entities/order.entity';
import { Product } from '../../../products/entities/product.entity';
import { Variant } from '../../../variants/entities/variant.entity';

@Entity('purchase_order_items') // Nombre de tabla para evitar conflicto con la entidad OrderItem principal
export class OrderItem {
  @ApiProperty({ example: 1, description: 'ID del ítem de la orden de compra' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID de la orden de compra asociada' })
  @Index()
  @Column({ name: 'order_id' })
  orderId: number;

  @ApiProperty({ example: 1, description: 'ID del producto' })
  @Index()
  @Column({ name: 'product_id' })
  productId: number;

  @ApiProperty({ example: 1, description: 'ID de la variante del producto' })
  @Index()
  @Column({ name: 'variant_id', nullable: true })
  variantId: number;

  @ApiProperty({ example: 5, description: 'Cantidad del producto' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ example: 10.5, description: 'Precio unitario del producto' })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @ApiProperty({ example: 52.5, description: 'Precio total del ítem' })
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice: number;

  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, (product) => product.purchaseOrderItems)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Variant, (variant) => variant.purchaseOrderItems)
  @JoinColumn({ name: 'variant_id' })
  variant: Variant;
}
