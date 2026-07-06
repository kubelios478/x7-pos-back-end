import { ApiProperty } from '@nestjs/swagger';
import { InventoryStockAlertResponseDto } from './inventory-stock-alert-response.dto';

export class PaginatedInventoryStockAlertsResponseDto {
  @ApiProperty({ type: [InventoryStockAlertResponseDto] })
  data: InventoryStockAlertResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}
