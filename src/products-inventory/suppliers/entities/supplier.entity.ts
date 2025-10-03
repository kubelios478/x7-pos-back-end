import { ApiProperty } from '@nestjs/swagger';
import { Product } from 'src/products-inventory/products/entities/product.entity';
import { Entity, ManyToOne } from 'typeorm';

@Entity({ name: 'supplier' })
export class Supplier {
  @ApiProperty({
    type: () => Product,
    isArray: true,
    required: false,
    description: 'List of categories associated with the merchant',
  })
  @ManyToOne(() => Product, (Product) => Product.merchant)
  products: Product[];
}
