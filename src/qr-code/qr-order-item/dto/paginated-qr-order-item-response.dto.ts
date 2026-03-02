//src/qr-code/qr-order-ite/dto/paginated-qr-order-item-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { QROrderItemResponseDto } from './qr-order-item-response.dto';

export class PaginatedQROrderItemResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of QR Order Items',
    type: [QROrderItemResponseDto],
  })
  data: QROrderItemResponseDto[];

  @ApiProperty({
    description: 'Pagination info',
    example: {
      total: 42,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
