//src/commerce/delivery-system/delivery-assignment/dto/delivery-assignment-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryDriver } from '../../delivery-driver/entity/delivery-driver.entity';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { AssignmentType } from '../constants/assignment-type.enum';

export class DeliveryAssignmentResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Delivery Assignment',
  })
  id: number;

  @ApiProperty({ type: () => Order, description: 'Related Order' })
  order: Order;

  @ApiPropertyOptional({
    type: () => DeliveryDriver,
    nullable: true,
    description: 'In-house driver (null while PENDING and for DSP deliveries)',
  })
  deliveryDriver: DeliveryDriver | null;

  @ApiProperty({ enum: AssignmentType, example: AssignmentType.IN_HOUSE })
  assignment_type: AssignmentType;

  @ApiProperty({
    example: DeliveryStatus.ASSIGNED,
    enum: DeliveryStatus,
    description: 'Status of the Delivery',
  })
  delivery_status: DeliveryStatus;

  @ApiPropertyOptional({ example: '2024-06-01T12:00:00Z', nullable: true })
  assigned_at: Date | null;

  @ApiPropertyOptional({ example: '2024-06-01T12:15:00Z', nullable: true })
  picked_up_at: Date | null;

  @ApiPropertyOptional({ example: '2024-06-01T12:30:00Z', nullable: true })
  delivered_at: Date | null;

  @ApiPropertyOptional({ example: 'a1b2c3d4-dsp', nullable: true })
  external_delivery_id: string | null;

  @ApiPropertyOptional({
    example: 'https://track.example.com/a1b2c3d4',
    nullable: true,
  })
  external_tracking_url: string | null;

  @ApiPropertyOptional({ example: 7.5, nullable: true })
  external_dsp_fee: number | null;

  @ApiProperty({
    example: 'active',
    description: 'Logical status of the delivery assignment',
  })
  status: string;
}

export class OneDeliveryAssignmentResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryAssignmentResponseDto;
}

export class AllDeliveryAssignmentResponseDto extends SuccessResponse {
  @ApiProperty()
  data: DeliveryAssignmentResponseDto[];
}
