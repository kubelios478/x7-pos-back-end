// src/companies/dtos/company-response.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Name of the company',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'contact@acme.com',
    description: 'Contact email of the company',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '123 Main St',
    description: 'Address of the company',
  })
  address?: string;
}
