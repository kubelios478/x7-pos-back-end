// src/platform-saas/companies/dtos/update-company-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CompanyStatus } from '../constants/company-status.enum';

export class UpdateCompanyStatusDto {
  @ApiProperty({
    enum: CompanyStatus,
    example: CompanyStatus.INACTIVE,
    description:
      'Target operational status. Use a non-active status to suspend the company (child merchants lose access) without deleting its data.',
  })
  @IsEnum(CompanyStatus)
  status: CompanyStatus;
}
