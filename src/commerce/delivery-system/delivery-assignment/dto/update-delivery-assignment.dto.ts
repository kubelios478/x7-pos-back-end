//src/commerce/delivery-system/delivery-assignment/dto/update-delivery-assignment.dto.ts
//
// No hereda de Create: el pedido y el tipo de asignación no cambian tras el alta, y los
// timestamps los pone el servidor al cambiar `delivery_status`.
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { DeliveryStatus } from '../constants/delivery-status.enum';

export class UpdateDeliveryAssignmentDto {
  @ApiPropertyOptional({
    example: 2,
    description:
      'Bind or replace the ACTIVE driver (IN_HOUSE only, while PENDING or ASSIGNED)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryDriver?: number;

  @ApiPropertyOptional({
    enum: DeliveryStatus,
    example: DeliveryStatus.PICKED_UP,
    description:
      'Next lifecycle status. Allowed: pending→assigned→picked_up→in_transit→delivered (picked_up→delivered also allowed); failed/cancelled from any non-terminal state.',
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  delivery_status?: DeliveryStatus;

  @ApiPropertyOptional({ example: 'a1b2c3d4-dsp' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  external_delivery_id?: string;

  @ApiPropertyOptional({ example: 'https://track.example.com/a1b2c3d4' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  external_tracking_url?: string;

  @ApiPropertyOptional({ example: 7.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  external_dsp_fee?: number;

  @ApiPropertyOptional({ example: 'inactive' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}
