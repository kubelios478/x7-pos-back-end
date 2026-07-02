import { ApiProperty } from '@nestjs/swagger';

export class MerchantAdminSummaryMetricsDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Downtown Bistro' })
  name: string;

  @ApiProperty({
    example: 12,
    description:
      'Active team members from collaborators, or users when no collaborators exist',
  })
  totalActiveTeamMembers: number;

  @ApiProperty({
    example: 24,
    description: 'Operational floor assets (non-deleted tables)',
  })
  operationalFloorAssets: number;

  @ApiProperty({
    example: 3,
    description: 'Active stock location hubs for the branch',
  })
  activeStockHubs: number;
}

export class MerchantAdminSummaryResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Merchant admin summary retrieved successfully' })
  message: string;

  @ApiProperty({ type: MerchantAdminSummaryMetricsDto })
  data: MerchantAdminSummaryMetricsDto;
}
