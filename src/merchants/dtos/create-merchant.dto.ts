// src/merchants/dtos/create-merchant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import {
  IsBusinessEmail,
  IsValidRUT,
} from '../../common/decorators/validation.decorators';

export class CreateMerchantDto {
  @IsString({ message: 'Merchant name must be a string' })
  @IsNotEmpty({ message: 'Merchant name is required' })
  @MinLength(2, { message: 'Merchant name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Merchant name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-.&]+$/, {
    message:
      'Merchant name can only contain letters, numbers, spaces, hyphens, dots, and ampersands',
  })
  @ApiProperty({
    example: 'Merchant Solutions Corp',
    description: 'Name of the Merchant',
    minLength: 2,
    maxLength: 100,
  })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsBusinessEmail({
    message:
      'Please use a business email address (personal email providers like Gmail, Yahoo, etc. are not allowed)',
  })
  @ApiProperty({
    example: 'contact@merchantsolutions.com',
    description: 'Business contact email of the Merchant',
  })
  email: string;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @MinLength(8, { message: 'Phone number must be at least 8 characters long' })
  @MaxLength(15, { message: 'Phone number cannot exceed 15 characters' })
  @Matches(/^[+]?[1-9][\d]{0,15}$/, {
    message:
      'Phone number must be a valid format (only numbers and optional + at the beginning)',
  })
  @ApiProperty({
    example: '+56987654321',
    description: 'Phone number of the Merchant',
    required: false,
    minLength: 8,
    maxLength: 15,
  })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'RUT must be a string' })
  @IsValidRUT({
    message: 'Please provide a valid Chilean RUT (format: 12345678-9)',
  })
  @ApiProperty({
    example: '12345678-9',
    description: 'Chilean RUT of the Merchant',
    required: false,
    pattern: '^[0-9]{7,8}-[0-9kK]$',
  })
  rut?: string;

  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address is required' })
  @MinLength(10, { message: 'Address must be at least 10 characters long' })
  @MaxLength(200, { message: 'Address cannot exceed 200 characters' })
  @ApiProperty({
    example: '123 Business Avenue, Suite 456',
    description: 'Physical address of the Merchant',
    minLength: 10,
    maxLength: 200,
  })
  address: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @MinLength(2, { message: 'City must be at least 2 characters long' })
  @MaxLength(50, { message: 'City cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'City can only contain letters, spaces, hyphens, and dots',
  })
  @ApiProperty({
    example: 'Santiago',
    description: 'City where the Merchant is located',
    minLength: 2,
    maxLength: 50,
  })
  city: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @MinLength(2, { message: 'State must be at least 2 characters long' })
  @MaxLength(50, { message: 'State cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'State can only contain letters, spaces, hyphens, and dots',
  })
  @ApiProperty({
    example: 'Metropolitan Region ',
    description: 'State/Region where the Merchant is located',
    minLength: 2,
    maxLength: 50,
  })
  state: string;

  @IsString({ message: 'Country must be a string' })
  @IsNotEmpty({ message: 'Country is required' })
  @MinLength(2, { message: 'Country must be at least 2 characters long' })
  @MaxLength(50, { message: 'Country cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'Country can only contain letters, spaces, hyphens, and dots',
  })
  @ApiProperty({
    example: 'Chile',
    description: 'Country where the Merchant is located',
    minLength: 2,
    maxLength: 50,
  })
  country: string;

  @IsNumber({}, { message: 'Company ID must be a valid number' })
  @ApiProperty({
    example: 123,
    description: 'ID of the Company that owns this Merchant',
    type: 'number',
  })
  companyId: number;
}
