import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ModifierAnalyticsItemDto } from './modifier-analytics-response.dto';

export class PaginatedModifierAnalyticsResponseDto extends SuccessResponse {
  @ApiProperty({
    type: [ModifierAnalyticsItemDto],
  })
  data: ModifierAnalyticsItemDto[];
}
