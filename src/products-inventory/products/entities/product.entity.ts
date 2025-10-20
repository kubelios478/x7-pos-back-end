import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Category } from 'src/products-inventory/category/entities/category.entity';
import { Supplier } from 'src/products-inventory/suppliers/entities/supplier.entity';
import { Variant } from 'src/products-inventory/variants/entities/variant.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'product' })
export class Product {
  @ApiProperty({ example: 1, description: 'Product ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Coca-Cola', description: 'Product name' })
  @Column({ unique: true, type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: '123456', description: 'Product SKU' })
  @Column({ unique: true, type: 'varchar', length: 255 })
  sku: string;

  @ApiProperty({ example: 10.99, description: 'Product base price' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @ApiProperty({
    example: 123,
    description: 'Merchant ID associated with the product',
  })
  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.products, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    example: 10,
    description: 'Category ID associated with the product',
  })
  @Column({ type: 'int' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ApiProperty({
    example: 10,
    description: 'Supplier ID associated with the product',
  })
  @Column({ type: 'int', nullable: true })
  supplierId: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, {
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier;

  @ApiProperty({ example: true, description: 'Product active status' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    type: () => Variant,
    isArray: true,
    required: false,
    description: 'List of suppliers associated with the merchant',
  })
  @OneToMany(() => Variant, (variant) => variant.product)
  variants: Variant[];
}
