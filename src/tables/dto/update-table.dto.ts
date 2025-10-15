import { IsString, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTableDto {
    @ApiPropertyOptional({ example: 'A1', description: 'Table number or identifier' })
    @IsString()
    @IsOptional()
    number?: string;

    @ApiPropertyOptional({ example: 4, description: 'Seating capacity (minimum 1 person)' })
    @IsNumber()
    @IsPositive()
    @Min(1)
    @IsOptional()
    capacity?: number;

    @ApiPropertyOptional({ example: 'available', description: 'Table status' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ example: 'Near window', description: 'Location description' })
    @IsString()
    @IsOptional()
    location?: string;
}
