import { ApiProperty } from '@nestjs/swagger';
import { CashMovementType } from '../constants/cash-movement-type.enum';

export class CashMovementResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  shiftId: number;

  @ApiProperty({ example: 50.0 })
  amount: number;

  @ApiProperty({ example: 'Kitchen cleaning' })
  reason: string;

  @ApiProperty({ example: 'https://cdn.receipt.com/img.jpg', nullable: true })
  receiptPhoto: string | null;

  @ApiProperty({ example: 3 })
  userId: number;

  @ApiProperty({ enum: CashMovementType, example: CashMovementType.OUTFLOW })
  type: CashMovementType;

  @ApiProperty({ example: '2024-01-15T12:00:00Z' })
  createdAt: Date;
}
