import { ApiProperty } from '@nestjs/swagger';

export class MerchantSubscriptionSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: { id: 1, name: 'Merchant A' } })
  merchant: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Plan Básico' } })
  plan: { id: number; name: string };

  @ApiProperty()
  startDate: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  renewalDate?: Date;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 'credit_card' })
  paymentMethod: string;
}
