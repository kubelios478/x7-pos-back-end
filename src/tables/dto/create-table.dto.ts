import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTableDto {
    @ApiProperty({ example: 1, description: 'Merchant ID' })
    @IsNumber()
    merchant_id: number;

    @ApiProperty({ example: 'A1', description: 'Table number or identifier' })
    @IsString()
    @IsNotEmpty()
    number: string;

    @ApiProperty({ example: 4, description: 'Seating capacity (minimum 1 person)' })
    @IsNumber()
    @IsPositive()
    @Min(1)
    capacity: number;

    @ApiProperty({ example: 'available', description: 'Table status' })
    @IsString()
    @IsNotEmpty()
    status: string;

    @ApiProperty({ example: 'Near window', description: 'Location description' })
    @IsString()
    @IsNotEmpty()
    location: string;
}