import { ApiProperty } from '@nestjs/swagger';

export class CategoryLittleResponseDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Beverages', description: 'Category name' })
  name: string;
}
