import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
}
