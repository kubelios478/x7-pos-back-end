import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateOnlineStoreDto {
  @ApiProperty({
    example: 'my-store',
    description:
      'Subdomain of the online store (alphanumeric and hyphens only)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Subdomain must contain only lowercase letters, numbers, and hyphens',
  })
  subdomain: string;

  @ApiPropertyOptional({
    example: 'default',
    description: 'Theme of the online store (defaults to "default")',
    default: 'default',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  theme?: string;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Currency code used in the online store (defaults to "USD")',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({
    example: 'America/New_York',
    description:
      'Timezone of the online store (defaults to "America/New_York")',
    default: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the online store is publicly available',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
