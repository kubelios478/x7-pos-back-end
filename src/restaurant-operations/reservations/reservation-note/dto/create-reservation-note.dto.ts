import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateReservationNoteDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  reservation_id: number;

  @ApiProperty({ example: 'Customer prefers a quiet table.' })
  @IsString()
  @IsNotEmpty()
  note: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  created_by?: number;
}
