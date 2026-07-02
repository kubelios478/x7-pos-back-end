import { ApiProperty } from '@nestjs/swagger';

export class CompanyProfileMetricsDto {
  @ApiProperty({ example: 5 })
  activeMerchantBranches: number;

  @ApiProperty({ example: 120 })
  globalCorporateCustomers: number;

  @ApiProperty({ example: 18 })
  authorizedMasterSuppliers: number;
}

export class CompanyProfileDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Acme Corp' })
  name: string;

  @ApiProperty({ example: '12.345.678-9' })
  rut: string;

  @ApiProperty({ example: 'contact@acme.com' })
  email: string;

  @ApiProperty({ example: '+1 (555) 123-4567', required: false })
  phone?: string;

  @ApiProperty({ example: '123 Main Street, Suite 100' })
  address: string;

  @ApiProperty({ example: 'Miami' })
  city: string;

  @ApiProperty({ example: 'California' })
  state: string;

  @ApiProperty({ example: 'USA' })
  country: string;

  @ApiProperty({ type: CompanyProfileMetricsDto })
  metrics: CompanyProfileMetricsDto;
}

export class CompanyProfileResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Company profile retrieved successfully' })
  message: string;

  @ApiProperty({ type: CompanyProfileDto })
  data: CompanyProfileDto;
}
