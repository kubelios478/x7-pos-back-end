import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeLineV1Dto {
  @ApiProperty({ example: 1, description: 'Raw Material (Supply) ID' })
  @IsInt()
  @Min(1)
  raw_material_id: number;

  @ApiProperty({ example: 150.5, description: 'Quantity required in consumption units' })
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiProperty({ example: 'grams', description: 'Unit of measure (in consumption units)' })
  @IsString()
  @IsNotEmpty()
  unit_of_measure: string;
}

export class CreateRecipeV1Dto {
  @ApiProperty({ example: 1, description: 'Product ID to assign the recipe to' })
  @IsInt()
  @Min(1)
  productId: number;

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
