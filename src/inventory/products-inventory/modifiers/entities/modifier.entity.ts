import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

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

  @ApiProperty({
    example: 10,
    description: 'Parent modifier ID',
    required: false,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Modifier, (modifier) => modifier.children, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Modifier | null;

  @OneToMany(() => Modifier, (modifier) => modifier.parent)
  children: Modifier[];
}
