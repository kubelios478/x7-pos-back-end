//src/qr-code/qr-order-item/entity/qr-order-item.entity.ts
import { QROrder } from 'src/qr-code/qr-order/entity/qr-order.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'qr_order_item' })
export class QROrderItem {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the QR Order Item',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the QR Order related',
  })
  @ManyToOne(() => QROrder, { eager: true })
  @JoinColumn({ name: 'qr_order_id' })
  qrOrder: QROrder;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product related',
  })
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant related (if applicable)',
  })
  @ManyToOne(() => Variant, { eager: true, nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: Variant;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total_price: number;

  @Column({ type: 'text' })
  notes: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the QR ORDER ITEM',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;
}
