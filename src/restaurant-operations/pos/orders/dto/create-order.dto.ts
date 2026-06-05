import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsPositive,
  IsOptional,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderBusinessStatus } from '../constants/order-business-status.enum';
import { OrderType } from '../constants/order-type.enum';
import { OrderSource } from '../constants/order-source.enum';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { CreateOrderItemDto } from '../../order-item/dto/create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Order',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  merchantId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Table associated with the Order',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  tableId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator (waiter) who took the order',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  collaboratorId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Subscription associated with the Order',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  subscriptionId: number;

  @ApiPropertyOptional({
    example: OrderBusinessStatus.PENDING,
    enum: OrderBusinessStatus,
    description:
      'Business status of the Order. Defaults to pending when omitted.',
  })
  @IsOptional()
  @IsEnum(OrderBusinessStatus)
  businessStatus?: OrderBusinessStatus;

  @ApiProperty({
    example: OrderType.DINE_IN,
    enum: OrderType,
    description: 'Type of the Order (dine_in, take_out, delivery)',
  })
  @IsEnum(OrderType)
  @IsNotEmpty()
  type: OrderType;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer associated with the Order',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  customerId: number;

  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00Z',
    description: 'Closing timestamp of the Order',
  })
  @IsDateString()
  @IsOptional()
  closedAt?: string;

  @ApiPropertyOptional({ example: OrderSource.POS, enum: OrderSource })
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @ApiPropertyOptional({ example: 2, description: 'Number of guests' })
  @IsOptional()
  @IsInt()
  @Min(1)
  guestCount?: number;

  @ApiPropertyOptional({ description: 'Delivery address' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Delivery zone id' })
  @IsOptional()
  @IsInt()
  deliveryZoneId?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  deliveryStatus?: DeliveryStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipTotal?: number;

  @ApiPropertyOptional({
    type: [CreateOrderItemDto],
    description:
      'Optional line items at creation time. Omit or send an empty array to add items later via POST /order-item.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  merchantTaxRuleIds?: number[];

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  merchantTipRuleId?: number;
}
