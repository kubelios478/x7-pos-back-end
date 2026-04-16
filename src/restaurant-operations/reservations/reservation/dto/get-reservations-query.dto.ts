import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetReservationsQueryDto {
    @ApiPropertyOptional({
        example: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        example: 10,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({
        example: '2026-04-16',
        description: 'Filter reservations by date (YYYY-MM-DD)',
    })
    @IsOptional()
    @IsString()
    date?: string;

    @ApiPropertyOptional({
        example: 1,
        description: 'Filter by customer ID',
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    customer_id?: number;
}
