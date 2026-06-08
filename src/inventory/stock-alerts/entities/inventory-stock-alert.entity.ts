import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Item } from 'src/inventory/products-inventory/stocks/items/entities/item.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { InventoryStockAlertType } from '../constants/inventory-stock-alert-type.enum';
import { InventoryStockAlertStatus } from '../constants/inventory-stock-alert-status.enum';

@Entity({ name: 'inventory_stock_alert' })
@Index(['merchantId', 'status'])
@Index(['categoryId'])
@Index(['stockItemId', 'status'])
export class InventoryStockAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  merchantId: number;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @Column({ type: 'int' })
  stockItemId: number;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stockItemId' })
  stockItem: Item;

  @Column({ type: 'int' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int' })
  variantId: number;

  @ManyToOne(() => Variant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variantId' })
  variant: Variant;

  @Column({ type: 'int' })
  locationId: number;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: Location;

  @Column({ type: 'int', nullable: true })
  categoryId: number | null;

  @ApiProperty({ enum: InventoryStockAlertType })
  @Column({ type: 'varchar', length: 32 })
  alertType: InventoryStockAlertType;

  @Column({ type: 'int' })
  currentQty: number;

  @Column({ type: 'int', nullable: true })
  minimumQty: number | null;

  @ApiProperty({ enum: InventoryStockAlertStatus })
  @Column({
    type: 'varchar',
    length: 32,
    default: InventoryStockAlertStatus.ACTIVE,
  })
  status: InventoryStockAlertStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  triggeredAt: Date;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  emailSentAt: Date | null;
}
