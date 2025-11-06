import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ProductResponseDto } from 'src/products-inventory/products/dto/product-response.dto';

export class ModifierResponseDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Phone', description: 'Product name' })
  name: string;

  @ApiProperty({ example: 100, description: 'Product price' })
  priceDelta: number;

  @ApiProperty({
    type: () => ProductResponseDto,
    nullable: true,
    description: 'Associated product details',
  })
  product: ProductResponseDto | null;
}

export class OneModifierResponse extends SuccessResponse {
  @ApiProperty()
  data: ModifierResponseDto;
}
export class AllModifiersResponse extends SuccessResponse {
  @ApiProperty()
  data: ModifierResponseDto[];
}
