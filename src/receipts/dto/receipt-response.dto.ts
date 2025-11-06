import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/dtos/success-response.dto';
import { ReceiptStatus } from '../constants/receipt-status.enum';

export class ReceiptResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 200 })
  orderId: number;

  @ApiProperty({ example: 'invoice' })
  type: string;

  @ApiProperty({ example: '{"tax_id": "12345678", "fiscal_number": "ABC123"}', required: false })
  fiscalData?: string | null;

  @ApiProperty({ example: 'active', enum: ReceiptStatus })
  status: ReceiptStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updatedAt: Date;
}

export class OneReceiptResponseDto extends SuccessResponse {
  @ApiProperty({ type: ReceiptResponseDto })
  data: ReceiptResponseDto;
}

export class PaginatedReceiptsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [ReceiptResponseDto] })
  data: ReceiptResponseDto[];

  @ApiProperty({
    example: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
  })
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}




