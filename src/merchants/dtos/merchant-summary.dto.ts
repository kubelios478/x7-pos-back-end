// src/clover/dtos/clover-merchant-summary.dto
import { ApiProperty } from '@nestjs/swagger';

export class MerchantSummaryDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Merchant',
  })
  id: number;

  @ApiProperty({
    example: 'Merchant ABC',
    description: 'Name of the Merchant',
  })
  name: string;
}
