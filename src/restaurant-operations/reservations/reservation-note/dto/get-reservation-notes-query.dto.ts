import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetReservationNotesQueryDto {
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

    @ApiPropertyOptional({ example: 1, description: 'Filter by user ID who created the note' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    created_by?: number;
}
