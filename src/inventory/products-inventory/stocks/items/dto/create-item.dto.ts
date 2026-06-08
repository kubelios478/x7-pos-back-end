import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 1, description: 'Associated product ID' })
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @ApiProperty({
    example: 1,
    description: 'Associated stock location ID',
  })
  @IsNotEmpty()
  @IsInt()
  locationId: number;

  @ApiProperty({
    example: 1,
    description: 'Associated variant ID (required)',
  })
  @IsNotEmpty()
  @IsInt()
  variantId: number;

  @ApiProperty({ example: 10, description: 'Current item quantity' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  currentQty: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Minimum quantity for low-stock alerts (omit to disable)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumQty?: number;
}
