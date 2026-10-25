import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsTimeZone,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRIMARY_INDUSTRY_OPTIONS } from '../onboarding.constants';

class DraftBusinessProfileDto {
  @IsOptional()
  @IsString()
  legalBusinessName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsIn([...PRIMARY_INDUSTRY_OPTIONS])
  primaryIndustry?: string;

  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

class DraftMerchantProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsTimeZone({
    message: 'timezone must be a valid IANA time zone, e.g. America/New_York',
  })
  timezone?: string;
}

class DraftAdminIdentityDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsEmail()
  workEmail?: string;
}

export class SaveOnboardingDraftDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  step?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  selectedTierId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DraftBusinessProfileDto)
  businessProfile?: DraftBusinessProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DraftMerchantProfileDto)
  merchantProfile?: DraftMerchantProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DraftAdminIdentityDto)
  adminIdentity?: DraftAdminIdentityDto;
}

export class SelectSubscriptionResponseDto {
  sessionId: string;
}

export class ProvisionAccountResponseDto {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    role: string;
    scope: string;
    merchant: { id: number };
    planId?: number;
    authorizedFeatureIds: number[];
  };
}
