import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { RecipeLineV1Dto } from './create-recipe-v1.dto';

export class UpdateRecipeV1Dto {
  @ApiPropertyOptional({ example: 2, description: 'Specific variant ID (optional)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;

  @ApiProperty({ type: [RecipeLineV1Dto], description: 'Recipe ingredient lines' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineV1Dto)
  lines: RecipeLineV1Dto[];
}
