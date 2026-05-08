//src/subscriptions/subscription-payments/dto/subscription-payments-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionPayment } from '../entity/subscription-payments.entity';

export class SubscriptionPaymentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the merchant subscription associated',
    required: false,
  })
  merchantSubscription?: { id: number } | null;

  @ApiProperty({
    example: 1,
    description: 'Company identifier',
    required: false,
  })
  company_id?: number | null;

  @ApiProperty({
    example: 3,
    description: 'Subscription plan identifier',
    required: false,
  })
  plan_id?: number | null;

  @ApiProperty({
    example: 'ext_123',
    description: 'External transaction identifier',
    required: false,
  })
  external_transaction_id?: string | null;

  @ApiProperty({ example: 10900 })
  amount: number;

  @ApiProperty({ example: 'Pesos' })
  currency: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: '2025-10-07' })
  paymentDate: Date;

  @ApiProperty({ example: 'credit_card' })
  paymentMethod: string;
}

export class OneSubscriptionPaymentResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPayment;
}

export class ALlSubscriptionPaymentsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPayment[];
}
