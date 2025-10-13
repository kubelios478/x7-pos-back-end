import { ApiProperty } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty({ example: 1, description: 'Supplier ID' })
  id: number;

  @ApiProperty({ example: 'Supplier Name', description: 'Supplier name' })
  name: string;

  @ApiProperty({
    example: 'contact@supplier.com',
    description: 'Supplier contact info',
  })
  contactInfo: string;
}
