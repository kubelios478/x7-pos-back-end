import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { PurchaseOrder } from 'src/products-inventory/purchase-order/entities/purchase-order.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'supplier' })
export class Supplier {
  @ApiProperty({ example: 1, description: 'Supplier ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Walmart', description: 'Supplier name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: '+123456', description: 'Supplier contact info' })
  @Column({ type: 'varchar', length: 255 })
  contactInfo: string;

  @ApiProperty({
    example: 123,
    description: 'Merchant ID associated with the supplier',
  })
  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.suppliers, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.supplier)
  products: Product[];

  @OneToMany(() => PurchaseOrder, (purchaseOrder) => purchaseOrder.supplier)
  purchaseOrders: PurchaseOrder[];
}
