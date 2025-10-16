// src/companies/dtos/update-company.dto.ts
import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/dtos/success-response.dto';
import { Company } from '../entities/company.entity';

export class SummaryCompanyResponseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Name of the company',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: 'contact@acme.com',
    description: 'Contact email of the company',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @ApiPropertyOptional({
    example: '123 Main St',
    description: 'Address of the company',
  })
  address?: string;
}

export class OneCompanyResponseDto extends SuccessResponse {
  @ApiProperty()
  data: Company;
}

export class AllCompanyResponseDto extends SuccessResponse {
  @ApiProperty()
  data: Company[];
}
