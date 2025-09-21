// src/companies/dtos/create-Merchant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNumber, IsString, MinLength } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({ example: 'Acme Corp', description: 'Name of the Merchant' })
  name: string;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the Merchant',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the Merchant',
  })
  @IsString()
  @MinLength(10)
  phone?: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the Merchant',
  })
  @IsString()
  @MinLength(6)
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the Merchant',
  })
  @IsString()
  @MinLength(10)
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the Merchant',
  })
  @IsString()
  @MinLength(10)
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the Merchant',
  })
  @IsString()
  @MinLength(10)
  country: string;

  @ApiProperty({
    example: '123',
    description: 'Company of the Merchant',
  })
  @IsNumber()
  companyId: number;
}
