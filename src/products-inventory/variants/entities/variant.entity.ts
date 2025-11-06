import { ApiProperty } from '@nestjs/swagger';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Item } from 'src/products-inventory/stocks/items/entities/item.entity';

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

  //@ApiProperty({ example: true, description: 'Variant active status' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Item, (item) => item.variant)
  items: Item[];
}
