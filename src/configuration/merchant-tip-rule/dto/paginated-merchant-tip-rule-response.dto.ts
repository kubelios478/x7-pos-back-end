//src/configuration/merchant-tip-rule/dto/paginated-merchant-tip-rule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantTipRuleResponseDto } from './merchant-tip-rule-response.dto';

export class PaginatedMerchantTipRuleResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Merchant Tip Rules',
    type: [MerchantTipRuleResponseDto],
  })
  data: MerchantTipRuleResponseDto[];

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
