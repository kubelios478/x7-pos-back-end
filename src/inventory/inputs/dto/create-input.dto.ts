import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { InputUnit } from '../constants/input-unit.enum';

export class CreateInputDto {
  @ApiProperty({ example: 'TOMATO_PASTE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  code: string;

  @ApiProperty({ example: 'Tomato paste' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: InputUnit, example: InputUnit.GRAM })
  @IsEnum(InputUnit)
  unit: InputUnit;

  @ApiPropertyOptional({ example: 'Canned tomato paste', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
