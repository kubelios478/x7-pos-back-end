// src/companies/dtos/Merchant-response.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateMerchantDto } from './create-merchant.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  @ApiPropertyOptional({
    example: 'Acme Corp',
    description: 'Name of the Merchant',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'contact@acme.com',
    description: 'Contact email of the Merchant',
  })
  email?: string;

  @ApiPropertyOptional({
    example: '123 Main St',
    description: 'Address of the Merchant',
  })
  address?: string;
}
