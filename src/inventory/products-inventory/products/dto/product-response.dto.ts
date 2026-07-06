import { ApiProperty } from '@nestjs/swagger';
import { MerchantResponseDto } from 'src/platform-saas/merchants/dtos/merchant-response.dto';
import { CategoryLittleResponseDto } from '../../category/dto/category-response.dto';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierLittleResponseDto } from '../../../../core/business-partners/suppliers/dto/supplier-response.dto';

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
    example: false,
    description:
      'True when all tracked stock rows at default sales location are depleted (CAT 1)',
  })
  isOutOfStock: boolean;

  @ApiProperty({
    example: false,
    description: 'True when any tracked stock row is at or below minimum qty',
  })
  isLowStock: boolean;

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
    type: () => SupplierLittleResponseDto,
    nullable: true,
    description: 'Associated supplier details',
  })
  supplier: SupplierLittleResponseDto | null;

  @ApiProperty({ example: true, description: 'Product active status' })
  isActive: boolean;

  @ApiProperty({
    example: [{ id: 1, name: 'Normal', price: 10.99, sku: 'VAR-01', isActive: true }],
    description: 'Product variants',
    required: false,
    nullable: true,
  })
  variants?: any[] | null;

  @ApiProperty({
    example: [{ id: 1, name: 'Extra Cheese', priceDelta: 1.50, isActive: true }],
    description: 'Product modifiers',
    required: false,
    nullable: true,
  })
  modifiers?: any[] | null;
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
