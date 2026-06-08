import { IsOptional, IsDateString } from 'class-validator';

export class GetCancelledOrdersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
