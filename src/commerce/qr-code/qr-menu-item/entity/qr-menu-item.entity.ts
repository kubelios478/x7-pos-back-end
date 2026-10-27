// src/qr-code/qr-menu-item/entity/qr-menu-item.entity.ts
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { QRMenuSection } from 'src/commerce/qr-code/qr-menu-section/entity/qr-menu-section.entity';

@Entity({ name: 'qr_menu_item' })
export class QRMenuItem {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the QR Menu Item',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the QR Menu Section related',
  })
  @ManyToOne(() => QRMenuSection)
  @JoinColumn({ name: 'qr_menu_section_id' })
  qrMenuSection: QRMenuSection;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product related',
  })
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant related',
  })
  @ManyToOne(() => Variant)
  @JoinColumn({ name: 'variant_id' })
  variant: Variant;

  @ApiProperty({
    example: 'Dish Name',
  })
  @Column({ type: 'varchar', length: 150, nullable: true })
  name: string;

  @ApiProperty({
    example: 15.0,
  })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    default: 0.0,
  })
  price: number;

  @ApiProperty({
    example: 'Dish description',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    example: 'https://...',
  })
  @Column({ type: 'text', nullable: true })
  image_url: string;

  @ApiProperty({
    example: 'active',
    description: 'Status of the QR MENU ITEM',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'int' })
  display_order: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean' })
  is_visible: boolean;
}
