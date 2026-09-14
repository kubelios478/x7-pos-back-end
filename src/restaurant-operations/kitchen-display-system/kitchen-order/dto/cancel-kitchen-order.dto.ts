import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { KitchenCancellationReason } from '../constants/kitchen-order-cancellation-reason.dto';
import { StockAdjustmentType } from '../constants/stock-adjustment-type.enum';

export class CancelKitchenOrderDto {
  @IsOptional()
  @IsString()
  @IsEnum(KitchenCancellationReason)
  reason?: KitchenCancellationReason;

  @IsOptional()
  @IsString()
  @IsEnum(StockAdjustmentType)
  stockAction?: StockAdjustmentType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

