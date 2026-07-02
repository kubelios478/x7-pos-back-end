import { ApiProperty } from '@nestjs/swagger';

export class CompanyConfigurationItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'merchant_tax_rule' })
  configurationType: string;

  @ApiProperty({ example: 'Tax Rules' })
  configurationLabel: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 38 })
  merchantId: number;

  @ApiProperty({ example: 'Downtown Bistro' })
  merchantName: string;

  @ApiProperty({ example: '2026-06-18' })
  updatedAt: string;
}

export class CompanyConfigurationsSummaryDto {
  @ApiProperty({ example: 12 })
  totalConfigurations: number;

  @ApiProperty({ example: 10 })
  activeConfigurations: number;

  @ApiProperty({ example: 4 })
  configurationTypes: number;
}

export class CompanyConfigurationsDataDto {
  @ApiProperty({ type: CompanyConfigurationsSummaryDto })
  summary: CompanyConfigurationsSummaryDto;

  @ApiProperty({ type: [CompanyConfigurationItemDto] })
  items: CompanyConfigurationItemDto[];
}

export class CompanyConfigurationsResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Company configurations retrieved successfully' })
  message: string;

  @ApiProperty({ type: CompanyConfigurationsDataDto })
  data: CompanyConfigurationsDataDto;
}
