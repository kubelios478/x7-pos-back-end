import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsInt, Min } from 'class-validator';

export class CloseCashShiftDto {
    @ApiProperty({
        example: 1480.0,
        description: 'Amount declared by the cashier when closing the shift',
    })
    @IsNumber()
    @Min(0)
    declaredAmount: number;

    @ApiProperty({ example: 5, description: 'ID of the collaborator closing the shift' })
    @IsInt()
    @IsPositive()
    collaboratorId: number;
}
