import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ProductLittleResponseDto } from '../../../products/dto/product-response.dto';
import { VariantLittleResponseDto } from '../../../variants/dto/variant-response.dto';
import { LocationLittleResponseDto } from '../../locations/dto/location-response.dto';

export class ItemResponseDto {
  @ApiProperty({ example: 1, description: 'Item ID' })
  id: number;

  @ApiProperty({ example: 5, description: 'Current quantity' })
  currentQty: number;

  @ApiProperty({
    type: () => ProductLittleResponseDto,
    nullable: true,
    description: 'Associated product details',
  })
  product: ProductLittleResponseDto | null;

  @ApiProperty({
    type: () => VariantLittleResponseDto,
    nullable: true,
    description: 'Associated variant details',
  })
  variant: VariantLittleResponseDto | null;

  @ApiProperty({
    type: () => LocationLittleResponseDto,
    description: 'Associated stock location details',
  })
  location: LocationLittleResponseDto | null;
}

export class ItemLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Item ID' })
  id: number;

  @ApiProperty({ example: 5, description: 'Current quantity' })
  currentQty: number;
}

export class OneItemResponse extends SuccessResponse {
  @ApiProperty()
  data: ItemResponseDto;
}
