import { IsString, IsNotEmpty, IsNumber, IsPositive, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsUnique } from 'src/validators/is-unique.validator';
import { CompositeUnique } from 'src/validators/composite-unique.decorator';

export class CreateTableDto {
    @ApiProperty({ example: 1, description: 'Merchant ID' })
    @IsNumber()
    merchant_id: number;

    @CompositeUnique('table', ['number', 'merchant_id'])
    @ApiProperty({ example: 'A1', description: 'Table number or identifier' })
    @IsString()
    @IsNotEmpty()

    number: string;

    @ApiProperty({ example: 4, description: 'Seating capacity' })
    @IsNumber()
    @IsPositive()
    capacity: number;

    @ApiProperty({ example: 'available', description: 'Table status' })
    @IsString()
    status: string;

    @ApiProperty({ example: 'Near window', description: 'Location description' })
    @IsString()
    location: string;
}