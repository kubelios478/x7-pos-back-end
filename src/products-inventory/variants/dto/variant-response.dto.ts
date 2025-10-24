import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from 'src/products-inventory/products/dto/product-response.dto';

export class VariantResponseDto {
  @ApiProperty({ example: 1, description: 'Variant ID' })
  id: number;

  @ApiProperty({ example: 'Phone', description: 'Variant name' })
  name: string;

  @ApiProperty({ example: 100, description: 'Variant price' })
  price: number;

  @ApiProperty({ example: 'Variant Sku', description: 'Variant SKU' })
  sku: string;

  @ApiProperty({
    type: () => ProductResponseDto,
    nullable: true,
    description: 'Associated product details',
  })
  product: ProductResponseDto | null;
}
