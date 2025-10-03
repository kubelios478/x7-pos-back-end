import { IsString, IsNotEmpty, IsNumber, IsPositive, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTableDto {
    @ApiProperty({ example: 1, description: 'Unique identifier of the Table' })
    @IsNumber()
    id: number;

    @ApiProperty({ example: 1, description: 'Merchant ID' })
    @IsNumber()
    merchant_id: number;

    @ApiProperty({ example: 'A1', description: 'Table number or identifier' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    number: string;

    @ApiProperty({ example: 4, description: 'Seating capacity' })
    @IsNumber()
    @IsPositive()
    capacity: number;

    @ApiProperty({ example: 'available', description: 'Table status' })
    @IsString()
    @MaxLength(50)
    status: string;

    @ApiProperty({ example: 'Near window', description: 'Location description' })
    @IsString()
    @MaxLength(100)
    location: string;
}
