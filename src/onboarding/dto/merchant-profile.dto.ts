import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';

export class MerchantProfileDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ example: 'Downtown Bistro' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({ example: 'contact@store.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+1 (555) 000-0000' })
  @ValidateIf(
    (dto: MerchantProfileDto) =>
      dto.phone !== undefined &&
      dto.phone !== null &&
      dto.phone.trim() !== '',
  )
  @IsString()
  @Matches(/^\+?[\d\s().-]{7,20}$/, {
    message: 'Phone must be a valid international phone number',
  })
  phone?: string;

  @ApiProperty({ example: '456 Oak Avenue' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  address: string;

  @ApiProperty({ example: 'Brooklyn' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  state: string;

  @ApiProperty({ example: 'USA' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  country: string;
}

export class MerchantProfileResponseDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  country?: string;
}
