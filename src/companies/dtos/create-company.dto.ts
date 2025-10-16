// src/companies/dtos/create-company.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  Length,
} from 'class-validator';
import {
  IsValidRUT,
  IsBusinessEmail,
} from '../../common/decorators/validation.decorators';

export class CreateCompanyDto {
  @IsString({ message: 'Company name must be a string' })
  @IsNotEmpty({ message: 'Company name is required' })
  @Length(2, 100, {
    message: 'Company name must be between 2 and 100 characters',
  })
  @Matches(/^[a-zA-Z0-9\s\-.&]+$/, {
    message:
      'Company name can only contain letters, numbers, spaces, hyphens, dots and ampersands',
  })
  @ApiProperty({
    example: 'Acme Corp',
    description: 'Name of the company',
    minLength: 2,
    maxLength: 100,
  })
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsBusinessEmail({ message: 'Please use a business email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @ApiProperty({
    example: 'contact@acme.com',
    description: 'Contact email of the company',
  })
  email: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\+?[\d\s\-()]{8,20}$/, {
    message:
      'Phone number must be between 8 and 20 characters and contain only numbers, spaces, hyphens, and parentheses',
  })
  @ApiProperty({
    example: '+1 (555) 123-4567',
    description: 'Phone number of the company',
    required: false,
  })
  phone?: string;

  @IsString({ message: 'RUT must be a string' })
  @IsNotEmpty({ message: 'RUT is required' })
  @Length(7, 15, { message: 'RUT must be between 7 and 15 characters' })
  @IsValidRUT({ message: 'Please provide a valid Chilean RUT format' })
  @ApiProperty({
    example: '12.345.678-9',
    description: 'RUT of the company',
    minLength: 7,
    maxLength: 15,
  })
  rut: string;

  @IsString({ message: 'Address must be a string' })
  @IsNotEmpty({ message: 'Address is required' })
  @Length(10, 200, { message: 'Address must be between 10 and 200 characters' })
  @ApiProperty({
    example: '123 Main Street, Suite 100',
    description: 'Address of the company',
    minLength: 10,
    maxLength: 200,
  })
  address: string;

  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City is required' })
  @Length(2, 50, { message: 'City must be between 2 and 50 characters' })
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'City can only contain letters, spaces, hyphens and dots',
  })
  @ApiProperty({
    example: 'Miami',
    description: 'City of the company',
    minLength: 2,
    maxLength: 50,
  })
  city: string;

  @IsString({ message: 'State must be a string' })
  @IsNotEmpty({ message: 'State is required' })
  @Length(2, 50, { message: 'State must be between 2 and 50 characters' })
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'State can only contain letters, spaces, hyphens and dots',
  })
  @ApiProperty({
    example: 'California',
    description: 'State of the company',
    minLength: 2,
    maxLength: 50,
  })
  state: string;

  @IsString({ message: 'Country must be a string' })
  @IsNotEmpty({ message: 'Country is required' })
  @Length(2, 50, { message: 'Country must be between 2 and 50 characters' })
  @Matches(/^[a-zA-Z\s\-.]+$/, {
    message: 'Country can only contain letters, spaces, hyphens and dots',
  })
  @ApiProperty({
    example: 'USA',
    description: 'Country of the company',
    minLength: 2,
    maxLength: 50,
  })
  country: string;
}
