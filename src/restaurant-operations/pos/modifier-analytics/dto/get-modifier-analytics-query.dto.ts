import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class GetModifierAnalyticsQueryDto {
  @ApiPropertyOptional({
    example: '2026-05-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-05-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
