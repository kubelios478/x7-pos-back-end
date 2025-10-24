import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ example: 'Color', description: 'Variant name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 10.99, description: 'Variant price' })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: '123456', description: 'Variant SKU' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({
    example: 1,
    description: 'Product ID associated with the variant',
  })
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;
}
