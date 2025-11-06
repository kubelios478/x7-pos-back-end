import { ApiProperty } from '@nestjs/swagger';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';
import { CategoryLittleResponseDto } from '../../category/dto/category-response.dto';
import { SupplierResponseDto } from 'src/products-inventory/suppliers/dto/supplier-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class ProductResponseDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Phone', description: 'Product name' })
  name: string;

  @ApiProperty({ example: 'Product Sku', description: 'Product SKU' })
  sku: string;

  @ApiProperty({ example: 100, description: 'Product base price' })
  basePrice: number;

  @ApiProperty({
    type: () => MerchantResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;

  @ApiProperty({
    type: () => CategoryLittleResponseDto,
    nullable: true,
    description: 'Associated category details',
  })
  category: CategoryLittleResponseDto | null;

  @ApiProperty({
    type: () => SupplierResponseDto,
    nullable: true,
    description: 'Associated supplier details',
  })
  supplier: SupplierResponseDto | null;
}

export class ProductLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Phone', description: 'Product name' })
  name: string;
}

export class OneProductResponse extends SuccessResponse {
  @ApiProperty()
  data: ProductResponseDto;
}
export class AllProductsResponse extends SuccessResponse {
  @ApiProperty()
  data: ProductResponseDto[];
}
