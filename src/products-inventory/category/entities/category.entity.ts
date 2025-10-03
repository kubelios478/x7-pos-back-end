import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
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

  @ApiProperty({
    type: () => Product,
    isArray: true,
    required: false,
    description: 'List of categories associated with the merchant',
  })
  @ManyToOne(() => Product, (Product) => Product.merchant)
  products: Product[];
}
