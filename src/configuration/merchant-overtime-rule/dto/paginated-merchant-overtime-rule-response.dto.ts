//src/configuration/merchant-overtime-rule/dto/paginated-merchant-overtime-rule-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantOvertimeRuleResponseDto } from './merchant-overtime-rule-response.dto';

export class PaginatedMerchantOvertimeRuleResponseDto extends SuccessResponse {
  @ApiProperty({
    description: 'List of Merchant Tip Rules',
    type: [MerchantOvertimeRuleResponseDto],
  })
  data: MerchantOvertimeRuleResponseDto[];

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
