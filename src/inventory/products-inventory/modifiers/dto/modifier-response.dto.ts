import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

export class ModifierResponseDto {
  @ApiProperty({ example: 1, description: 'Modifier ID' })
  id: number;

  @ApiProperty({ example: 'Extra cheese', description: 'Modifier name' })
  name: string;

  @ApiProperty({ example: 1.5, description: 'Modifier price delta' })
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
