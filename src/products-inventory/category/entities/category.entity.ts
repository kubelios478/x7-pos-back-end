import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from 'src/products-inventory/products/entities/product.entity';

@Entity({ name: 'category' })
export class Category {
  @ApiProperty({ example: 1, description: 'Category ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  @Column({ unique: true, type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    example: 123,
    description: 'Merchant ID associated to the category',
  })
  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.categories, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    example: 10,
    description: 'Parent category ID',
    required: false,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @ManyToOne(() => Category, (category) => category.children, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @ApiProperty({ example: true, description: 'Category active status' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;
}
