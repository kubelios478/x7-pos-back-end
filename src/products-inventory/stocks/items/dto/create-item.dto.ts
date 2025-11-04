import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 1, description: 'ID del producto asociado' })
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la ubicación de stock asociada',
  })
  @IsNotEmpty()
  @IsInt()
  locationId: number;

  @ApiProperty({
    example: 1,
    description: 'ID de la variante asociada (obligatorio)',
  })
  @IsNotEmpty()
  @IsInt()
  variantId: number;

  @ApiProperty({ example: 10, description: 'Cantidad actual del item' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  currentQty: number;
}
