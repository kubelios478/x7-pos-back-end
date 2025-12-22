import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { OnlineOrderStatus } from '../constants/online-order-status.enum';
import { OnlineOrderType } from '../constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from '../constants/online-order-payment-status.enum';

export class BasicMerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @ApiProperty({ example: 'My Merchant', description: 'Merchant name' })
  name: string;
}

export class BasicOnlineStoreInfoDto {
  @ApiProperty({ example: 1, description: 'Online Store ID' })
  id: number;

  @ApiProperty({ example: 'my-store', description: 'Online Store subdomain' })
  subdomain: string;
}

export class BasicOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Order ID' })
  id: number;
}

export class BasicCustomerInfoDto {
  @ApiProperty({ example: 1, description: 'Customer ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Customer email' })
  email: string;
}

export class OnlineOrderResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Order' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  merchantId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Store' })
  storeId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Order', nullable: true })
  orderId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Customer' })
  customerId: number;

  @ApiProperty({
    example: OnlineOrderStatus.ACTIVE,
    enum: OnlineOrderStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineOrderStatus;

  @ApiProperty({
    example: OnlineOrderType.DELIVERY,
    enum: OnlineOrderType,
    description: 'Type of the order (delivery, pickup, dine_in)',
  })
  type: OnlineOrderType;

  @ApiProperty({
    example: OnlineOrderPaymentStatus.PENDING,
    enum: OnlineOrderPaymentStatus,
    description: 'Payment status of the order (pending, paid, failed, refunded)',
  })
  paymentStatus: OnlineOrderPaymentStatus;

  @ApiProperty({ example: '2024-01-15T10:00:00Z', description: 'Scheduled time for the order', nullable: true })
  scheduledAt: Date | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Time when the order was placed', nullable: true })
  placedAt: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ example: 125.99, description: 'Total amount of the order' })
  totalAmount: number;

  @ApiProperty({ example: 'Please deliver to the back door', description: 'Additional notes for the order', nullable: true })
  notes: string | null;

  @ApiProperty({ type: () => BasicMerchantInfoDto, description: 'Merchant information' })
  merchant: BasicMerchantInfoDto;

  @ApiProperty({ type: () => BasicOnlineStoreInfoDto, description: 'Online Store information' })
  store: BasicOnlineStoreInfoDto;

  @ApiProperty({ type: () => BasicOrderInfoDto, description: 'Order information', nullable: true })
  order: BasicOrderInfoDto | null;

  @ApiProperty({ type: () => BasicCustomerInfoDto, description: 'Customer information' })
  customer: BasicCustomerInfoDto;
}

export class OneOnlineOrderResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => OnlineOrderResponseDto, description: 'Online order data' })
  data: OnlineOrderResponseDto;
}



