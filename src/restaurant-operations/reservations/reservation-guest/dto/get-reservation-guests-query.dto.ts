import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetReservationGuestsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 1, description: 'Filter by reservation ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  reservation_id?: number;

  @ApiPropertyOptional({
    example: 'John',
    description: 'Filter by name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
