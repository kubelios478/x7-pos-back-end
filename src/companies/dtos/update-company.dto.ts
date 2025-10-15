// src/companies/dtos/update-company.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  // All properties are optional and inherited from CreateCompanyDto
  // with the same validations applied when present
}
