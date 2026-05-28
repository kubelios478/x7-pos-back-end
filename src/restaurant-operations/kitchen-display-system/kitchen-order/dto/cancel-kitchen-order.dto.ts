import { IsEnum, IsOptional, IsString } from 'class-validator';
import { KitchenCancellationReason } from '../constants/kitchen-order-cancellation-reason.dto';

export class CancelKitchenOrderDto {
  @IsOptional()
  @IsString()
  @IsEnum(KitchenCancellationReason)
  reason: KitchenCancellationReason;
}
