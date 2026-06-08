import { ApiProperty } from '@nestjs/swagger';

export class LoyaltyPointsLockResponseDto {
  @ApiProperty({ example: 1 })
  lockId: number;

  @ApiProperty({ example: 500 })
  reservedPoints: number;

  @ApiProperty({ example: 5.0 })
  reservedAmount: number;

  @ApiProperty()
  expiresAt: Date;
}
