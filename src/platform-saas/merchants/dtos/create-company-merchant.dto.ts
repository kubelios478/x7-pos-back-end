import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MerchantStatus } from '../constants/merchant-status.enum';

export class CreateCompanyMerchantDto {
  @ApiProperty({ example: 'Downtown Bistro' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-.&()]+$/, {
    message:
      'Merchant name can only contain letters, numbers, spaces, and common punctuation',
  })
  name: string;

  @ApiProperty({ example: '12-3456789' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'Tax ID must contain only letters, numbers, and hyphens',
  })
  rut: string;

  @ApiPropertyOptional({ example: 'contact@store.com' })
  @ValidateIf((dto: CreateCompanyMerchantDto) => Boolean(dto.email?.trim()))
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: '+15550001234' })
  @ValidateIf((dto: CreateCompanyMerchantDto) => Boolean(dto.phone?.trim()))
  @IsString()
  @Matches(/^\+?[\d\s().-]{7,20}$/, {
    message: 'Phone must be a valid international phone number',
  })
  phone?: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  address: string;

  @ApiProperty({ example: 'Miami' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  city: string;

  @ApiProperty({ example: 'Florida' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  state: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  country: string;

  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;
}
