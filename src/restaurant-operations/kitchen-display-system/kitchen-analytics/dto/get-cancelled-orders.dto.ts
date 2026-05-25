import { IsOptional, IsDateString, IsString } from 'class-validator';

export class GetCancelledOrdersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
