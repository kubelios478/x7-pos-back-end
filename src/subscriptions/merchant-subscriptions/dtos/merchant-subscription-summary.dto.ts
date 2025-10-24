//src/subscriptions/merchant-subscriptions/dtos/merchant-subscriptions-summary.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantSubscription } from '../entities/merchant-subscription.entity';

export class MerchantSubscriptionSummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: { id: 1, name: 'Merchant A' } })
  merchant: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Basic Plan' } })
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

export class OneMerchantSubscriptionSummaryDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantSubscription;
}

export class AllMerchantSubscriptionSummaryDto extends SuccessResponse {
  @ApiProperty()
  data: MerchantSubscription[];
}
