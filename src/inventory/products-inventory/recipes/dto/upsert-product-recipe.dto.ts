import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { RecipeLineInputDto } from './recipe-line-input.dto';

export class UpsertProductRecipeDto {
  @ApiPropertyOptional({
    description:
      'Variant of the finished product this recipe applies to; omit for the default recipe.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  finishedVariantId?: number;

  @ApiProperty({ type: [RecipeLineInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineInputDto)
  lines: RecipeLineInputDto[];
}
