import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Product } from '../../products/entities/product.entity';
import { Variant } from '../../variants/entities/variant.entity';
import { ProductRecipeLine } from './product-recipe-line.entity';

@Entity('product_recipe')
@Index(['merchantId', 'finishedProductId'])
export class ProductRecipe {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'merchant_id' })
  merchantId: number;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', name: 'finished_product_id' })
  finishedProductId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'finished_product_id' })
  finishedProduct: Product;

  @ApiPropertyOptional({
    example: 2,
    description:
      'When set, this recipe applies only to order lines with this variant. When null, applies when no variant-specific recipe matches the line.',
  })
  @Column({ type: 'int', name: 'finished_variant_id', nullable: true })
  finishedVariantId: number | null;

  @ManyToOne(() => Variant, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'finished_variant_id' })
  finishedVariant: Variant | null;

  @OneToMany(() => ProductRecipeLine, (line) => line.recipe, { cascade: true })
  lines: ProductRecipeLine[];

  @ApiPropertyOptional({
    example: 4.25,
    description:
      'Cached base theoretical cost per sold unit (REQUIRED + OPTIONAL lines without modifier), from last purchase prices',
  })
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 4,
    name: 'theoretical_cost_cached',
    nullable: true,
  })
  theoreticalCostCached: string | null;
}
