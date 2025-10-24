import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class CategoryResponseDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  name: string;

  @ApiProperty({
    type: () => MerchantResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;

  @ApiProperty({
    example: 123,
    description: 'Parent ID',
    required: false,
    nullable: true,
  })
  parentId?: number;

  @ApiProperty({
    example: 'Food',
    description: 'Parent category name',
    required: false,
    nullable: true,
  })
  parentName?: string;

  @ApiProperty({
    example: [{ id: 1, parentName: 'Food' }],
    description: 'Parent categories',
    required: false,
    nullable: true,
  })
  parents?: { id: number; parentName: string }[];
}
export class CategoryLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  name: string;

  @ApiProperty({
    type: () => CategoryLittleResponseDto,
    nullable: true,
    description: 'Parent category details',
  })
  parent?: CategoryLittleResponseDto | null;
}

export class OneCategoryResponse extends SuccessResponse {
  @ApiProperty()
  data: CategoryResponseDto;
}
export class AllCategoryResponse extends SuccessResponse {
  @ApiProperty()
  data: CategoryResponseDto[];
}
