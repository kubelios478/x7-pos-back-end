import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetTablesQueryDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Page number for pagination (minimum 1)',
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of items per page (1-100)',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ 
    example: 'available', 
    description: 'Filter tables by status'
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ 
    example: 4, 
    description: 'Filter tables by minimum capacity',
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minCapacity?: number;

  @ApiPropertyOptional({ 
    example: 8, 
    description: 'Filter tables by maximum capacity',
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxCapacity?: number;
}



