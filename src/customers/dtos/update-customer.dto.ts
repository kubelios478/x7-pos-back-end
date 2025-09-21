// src/customers/dtos/update-customer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateCustomerDto {
  @ApiProperty({
    example: 1234567890,
    description: 'Company ID of the customer',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  companyId?: number;

  @ApiProperty({
    example: 'johndoe',
    description: 'Name of the customer',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Email of the customer',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Phone number of the customer',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '1234567890',
    description: 'RUT of the customer',
  })
  @IsOptional()
  @IsString()
  rut?: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the customer',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the customer',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the customer',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the customer',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
