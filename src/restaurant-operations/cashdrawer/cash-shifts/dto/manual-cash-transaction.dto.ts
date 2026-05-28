import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { CashShiftMovementType } from '../constants/cash-shift-movement-type.enum';

export class ManualCashTransactionDto {
    @ApiProperty({
        description: 'Monto de la transacción',
        example: 50.0,
        minimum: 0.01,
    })
    @IsNumber()
    @Min(0.01)
    amount: number;

    @ApiProperty({
        description: 'Tipo de movimiento manual (IN = Ingreso, OUT = Egreso)',
        enum: CashShiftMovementType,
        example: CashShiftMovementType.OUT,
    })
    @IsEnum(CashShiftMovementType)
    @IsNotEmpty()
    type: CashShiftMovementType;

    @ApiProperty({
        description: 'Motivo o descripción de la transacción (ej. Pago a proveedores)',
        example: 'Pago a proveedor de bebidas',
    })
    @IsString()
    @IsNotEmpty()
    reason: string;

    @ApiProperty({
        description: 'ID del colaborador que realiza el movimiento',
        example: 5,
    })
    @IsNumber()
    @IsNotEmpty()
    collaboratorId: number;
}
