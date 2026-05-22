import { ApiProperty } from '@nestjs/swagger';

export class ModifierAnalyticsItemDto {
  @ApiProperty()
  modifierId: number;

  @ApiProperty()
  modifierName: string;

  @ApiProperty()
  productId: number;

  @ApiProperty()
  usageCount: number;

  @ApiProperty()
  totalRevenue: number;
}
