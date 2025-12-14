import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyTierBenefit } from '../constants/loyalty-tier-benefit.enum';

export class GetLoyaltyTiersDto {
  @ApiPropertyOptional({
    description: 'Filter by loyalty program ID',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  loyalty_program_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by loyalty tier name',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by loyalty tier level',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  level?: number;

  @ApiPropertyOptional({
    description: 'Filter by minimum points (greater than or equal to)',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  min_points?: number;

  @ApiPropertyOptional({
    description: 'Filter by benefits (can be multiple)',
    enum: LoyaltyTierBenefit,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(LoyaltyTierBenefit, { each: true })
  benefits?: LoyaltyTierBenefit[];

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
