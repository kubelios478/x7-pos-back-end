import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Item } from '../../stocks/items/entities/item.entity';
import { PurchaseOrderItem } from '../../purchase-order-item/entities/purchase-order-item.entity';
import { VariantStockBasisKind } from '../../recipes/constants/variant-stock-basis-kind.enum';

@Entity({ name: 'variant' })
export class Variant {
  @ApiProperty({ example: 1, description: 'Variant ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Color', description: 'Variant name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 10.99, description: 'Variant price' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ example: '123456', description: 'Variant SKU' })
  @Column({ type: 'varchar', length: 255 })
  sku: string;

  @ApiProperty({
    example: 1,
    description: 'Product ID associated with the variant',
  })
  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.variants, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    enum: VariantStockBasisKind,
    description:
      'How inventory integer quantity maps for recipe UOM conversion (default: one count per qty)',
  })
  @Column({
    type: 'enum',
    enum: VariantStockBasisKind,
    name: 'stock_basis_kind',
    nullable: true,
  })
  stockBasisKind: VariantStockBasisKind | null;

  @ApiPropertyOptional({
    example: 25000,
    description:
      'Canonical units (grams, ml, or 1 for UNIT_COUNT) represented by one +1 of stock currentQty',
  })
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 4,
    name: 'base_units_per_stock_increment',
    nullable: true,
  })
  baseUnitsPerStockIncrement: string | null;

  @OneToMany(() => Item, (item) => item.variant)
  items: Item[];

  @OneToMany(
    () => PurchaseOrderItem,
    (purchaseOrderItem) => purchaseOrderItem.variant,
  )
  purchaseOrderItems: PurchaseOrderItem[];
}
