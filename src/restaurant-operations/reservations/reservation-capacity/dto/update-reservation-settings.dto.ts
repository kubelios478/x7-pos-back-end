import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ALLOWED_SLOT_INTERVALS } from '../constants/capacity.constants';

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class ServiceShiftDto {
  @ApiPropertyOptional({ example: 'Dinner' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiPropertyOptional({ example: '19:00', description: 'Local time HH:mm' })
  @Matches(CLOCK, { message: 'start must be a HH:mm time' })
  start: string;

  @ApiPropertyOptional({
    example: '23:00',
    description: 'Local time HH:mm; earlier than start = crosses midnight',
  })
  @Matches(CLOCK, { message: 'end must be a HH:mm time' })
  end: string;
}

// `null` explícito borra el ajuste (vuelve al valor por defecto); ausente = no tocar.
export class UpdateReservationSettingsDto {
  @ApiPropertyOptional({
    example: 80,
    nullable: true,
    description: 'Total seats; null = sum of the capacity of active tables',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10000)
  seat_capacity?: number | null;

  @ApiPropertyOptional({ example: 15, enum: ALLOWED_SLOT_INTERVALS })
  @IsOptional()
  @IsIn(ALLOWED_SLOT_INTERVALS)
  slot_interval_minutes?: number;

  @ApiPropertyOptional({
    example: 30,
    nullable: true,
    description: 'Max guests arriving per slot; null = no pacing limit',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10000)
  max_covers_per_slot?: number | null;

  @ApiPropertyOptional({
    type: [ServiceShiftDto],
    nullable: true,
    description: 'Service shifts; null = default Lunch 12:00–16:00 and Dinner 19:00–23:00',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ServiceShiftDto)
  shifts?: ServiceShiftDto[] | null;
}
