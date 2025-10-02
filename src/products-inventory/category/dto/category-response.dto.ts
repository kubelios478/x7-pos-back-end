import { ApiProperty } from '@nestjs/swagger';
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
}
