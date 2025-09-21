// src/clover/dtos/create-clover-merchant.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateCloverMerchantDto {
  @ApiProperty({
    example: 'Merchant ABC',
    description: 'Name of the Clover merchant',
  })
  merchantId: string;

  @ApiProperty({
    example: 'token_123',
    description: 'Access token for Clover API',
  })
  accessToken: string;

  @ApiProperty({ example: 1, description: 'ID of the associated company' })
  companyId: number;
}
