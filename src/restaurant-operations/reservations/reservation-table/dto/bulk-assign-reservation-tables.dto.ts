import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';

/**
 * Vinculación de VARIAS mesas a una reserva en un solo viaje.
 *
 * Existe porque juntar mesas para un grupo grande es una decisión atómica: si la segunda mesa
 * de una combinación de tres está ocupada, dejar las otras dos asignadas deja al grupo con
 * sitio para la mitad de sus comensales y a la sala creyendo que la reserva está resuelta.
 * El servicio lo ejecuta dentro de una transacción, así que o entran todas o no entra ninguna.
 */
export class BulkAssignReservationTablesDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  reservation_id: number;

  @ApiProperty({ example: [12, 13], description: 'Physical tables to combine' })
  @IsArray()
  @ArrayNotEmpty()
  // Repetir un id en la misma petición intentaría insertar dos veces la misma mesa.
  @ArrayUnique()
  @IsInt({ each: true })
  table_ids: number[];
}
