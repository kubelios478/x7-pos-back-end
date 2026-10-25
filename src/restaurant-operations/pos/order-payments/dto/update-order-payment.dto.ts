import { PartialType, PickType } from '@nestjs/swagger';
import { CreateOrderPaymentDto } from './create-order-payment.dto';

/**
 * Only the descriptive fields of a payment can change. Amount, method, tip, refund flag
 * and order are part of what the till took in; a wrong payment is corrected with a refund.
 */
export class UpdateOrderPaymentDto extends PartialType(
  PickType(CreateOrderPaymentDto, ['provider', 'reference'] as const),
) {}
