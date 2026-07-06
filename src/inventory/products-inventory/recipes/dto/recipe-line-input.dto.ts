import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { RecipeLineType } from '../constants/recipe-line-type.enum';
import { RecipeQuantityUnit } from '../constants/recipe-quantity-unit.enum';

export class RecipeLineInputDto {
  @ApiProperty({ enum: RecipeLineType })
  @IsEnum(RecipeLineType)
  lineType: RecipeLineType;

  @ApiPropertyOptional({
    description:
      'When lineType is MODIFIER this must be set. When OPTIONAL, set to tie the line to a POS modifier.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  modifierId?: number;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplyProductId: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplyVariantId: number;

  @ApiProperty({ example: '0.2500' })
  @IsString()
  @IsNotEmpty()
  quantityPerSoldUnit: string;

  @ApiProperty({ enum: RecipeQuantityUnit })
  @IsEnum(RecipeQuantityUnit)
  quantityUnit: RecipeQuantityUnit;
}
