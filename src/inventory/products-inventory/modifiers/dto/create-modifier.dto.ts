import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateModifierDto {
  @ApiProperty({ example: 'Color', description: 'Modifier name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 10.99, description: 'Modifier price' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  priceDelta: number;

  @ApiProperty({
    example: 1,
    description: 'Product ID associated with the Modifier',
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @ApiProperty({
    example: 2,
    description: 'Parent modifier ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  parentId?: number;
}
