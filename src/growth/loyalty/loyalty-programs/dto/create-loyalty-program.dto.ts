import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LoyaltyPointsRoundingMode } from '../../constants/loyalty-points-rounding-mode.enum';

export class CreateLoyaltyProgramDto {
  @ApiProperty({
    example: 'Gold Program',
    description: 'Name of the loyalty program',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'Earn points for every purchase',
    description: 'Description of the loyalty program',
    nullable: true,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the loyalty program is active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    example: 1.0,
    description: 'Points earned per currency unit (e.g., 1 point per $1)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  points_per_currency: number;

  @ApiProperty({
    example: 100,
    description:
      'Points required to redeem 1 currency unit (e.g., 100 points = $1.00). Used to convert points to money at checkout.',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  redeem_points_per_currency: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum points required to redeem a reward',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  min_points_to_redeem: number;

  @ApiProperty({
    example: 5,
    description:
      'Percent of net order value awarded as points (excludes tax and tips). When omitted or 0, points_per_currency applies.',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  earn_rate_percent?: number;

  @ApiProperty({
    enum: LoyaltyPointsRoundingMode,
    example: LoyaltyPointsRoundingMode.NEAREST,
    required: false,
  })
  @IsEnum(LoyaltyPointsRoundingMode)
  @IsOptional()
  points_rounding_mode?: LoyaltyPointsRoundingMode;
}
