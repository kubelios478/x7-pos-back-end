import { ApiProperty } from '@nestjs/swagger';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'modifier' })
export class Modifier {
  @ApiProperty({ example: 1, description: 'Modifier ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Size', description: 'Modifier name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 10.99, description: 'Modifier price' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceDelta: number;

  // @ApiProperty({ example: true, description: 'Modifier active status' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    example: 1,
    description: 'Product ID associated with the variant',
  })
  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.modifiers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
