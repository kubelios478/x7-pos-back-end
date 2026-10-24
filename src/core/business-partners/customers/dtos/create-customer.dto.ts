// src/customers/dto/create-customer.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'johndoe', description: 'Name of the customer' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'johndoe@example.com',
    description: 'Email of the customer',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number of the customer',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'D123-4567-8901',
    description:
      "Optional identification document of the customer (e.g. driver's license or tax ID). Customers usually have none.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  document_id?: string;

  @ApiPropertyOptional({
    example: '12-3456789',
    description: 'Deprecated: use document_id. Accepted as an alias on input.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rut?: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address of the customer',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    example: 'Miami',
    description: 'City of the customer',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    example: 'California',
    description: 'State of the customer',
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({
    example: 'USA',
    description: 'Country of the customer',
  })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({
    example: 1234567890,
    description: 'Company ID of the customer',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  companyId?: number;
}
