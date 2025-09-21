// src/companies/dtos/create-company.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  @ApiProperty({ example: 'Acme Corp', description: 'Name of the company' })
  name: string;

  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the company',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the company',
  })
  @IsString()
  @MinLength(10)
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the company',
  })
  @IsString()
  @MinLength(10)
  rut: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the company',
  })
  @IsString()
  @MinLength(10)
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the company',
  })
  @IsString()
  @MinLength(10)
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the company',
  })
  @IsString()
  @MinLength(10)
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the company',
  })
  @IsString()
  @MinLength(10)
  country: string;
}
