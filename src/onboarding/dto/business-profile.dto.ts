import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { PRIMARY_INDUSTRY_OPTIONS } from '../onboarding.constants';

export class BusinessProfileDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ example: 'Acme Restaurant LLC' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  legalBusinessName: string;

  @ApiProperty({ example: '12-3456789' })
  @IsString()
  @Matches(/^\d{2}-\d{7}$/, {
    message: 'Tax ID / EIN must follow the 00-0000000 format',
  })
  taxId: string;

  @ApiProperty({ example: 'Full Service Restaurant' })
  @IsString()
  @IsIn([...PRIMARY_INDUSTRY_OPTIONS])
  primaryIndustry: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 200)
  registeredAddress: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  city: string;

  @ApiProperty({ example: 'NY' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'State must be a 2-letter uppercase code',
  })
  state: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'Zip code must be a valid US zip code',
  })
  zipCode: string;
}

export class BusinessProfileResponseDto {
  @ApiPropertyOptional()
  legalBusinessName?: string;

  @ApiPropertyOptional()
  taxId?: string;

  @ApiPropertyOptional()
  primaryIndustry?: string;

  @ApiPropertyOptional()
  registeredAddress?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  zipCode?: string;
}
