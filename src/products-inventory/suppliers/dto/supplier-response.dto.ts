import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class SupplierResponseDto {
  @ApiProperty({ example: 1, description: 'Supplier ID' })
  id: number;

  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  name: string;

  @ApiProperty({ example: '+123456789', description: 'Supplier contact info' })
  contactInfo: string;

  @ApiProperty({
    type: () => MerchantResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;
}

export class OneSupplierResponse extends SuccessResponse {
  @ApiProperty()
  data: SupplierResponseDto;
}
