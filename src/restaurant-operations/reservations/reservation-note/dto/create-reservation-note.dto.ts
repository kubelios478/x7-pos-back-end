import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateReservationNoteDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  reservation_id: number;

  @ApiProperty({ example: 'Customer prefers a quiet table.' })
  @IsString()
  // El recorte va ANTES de @IsNotEmpty: sin él, `@IsNotEmpty` da por buena una nota de puros
  // espacios ("   "), que entra en la base como una tarjeta en blanco en el pase de cocina.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsNotEmpty({ message: 'note must not be empty or whitespace-only' })
  note: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  created_by?: number;
}
