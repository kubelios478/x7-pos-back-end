import { ApiProperty } from '@nestjs/swagger';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class SupplierResponseDto {
  @ApiProperty({ example: 1, description: 'Supplier ID' })
  id: number;

  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  name: string;

  @ApiProperty({ example: '+123456789', description: 'Supplier contact info' })
  contactInfo: string;

  @ApiProperty({ example: true, description: 'Supplier status' })
  isActive?: boolean;

  @ApiProperty({
    type: () => MerchantResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;
}
