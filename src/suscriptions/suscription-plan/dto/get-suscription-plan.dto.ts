import { IsOptional, IsPositive, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSuscriptionPlanDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  status?: string;
}
