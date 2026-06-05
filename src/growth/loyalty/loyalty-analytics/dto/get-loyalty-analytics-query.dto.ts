import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLoyaltyAnalyticsQueryDto {
  @ApiProperty({
    example: '2026-01-01',
    description: 'Start date (inclusive), ISO date YYYY-MM-DD',
  })
  @IsDateString()
  fromDate: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'End date (inclusive), ISO date YYYY-MM-DD',
  })
  @IsDateString()
  toDate: string;

  @ApiPropertyOptional({
    example: 5000,
    description:
      'VIP filter: only include customers whose lifetime accumulated points are greater than or equal to this value',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minLifetimePoints?: number;
}
