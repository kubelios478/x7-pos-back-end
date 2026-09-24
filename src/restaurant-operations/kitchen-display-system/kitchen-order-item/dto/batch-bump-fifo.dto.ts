import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class BatchBumpFifoDto {
  @ApiProperty({
    example: 'Classic Burger',
    description: 'Product name to batch bump in FIFO order across active tickets',
  })
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString({ message: 'Product name must be a string' })
  productName: string;

  @ApiPropertyOptional({
    example: 'Double Patty',
    description: 'Specific variant name if applicable (optional)',
  })
  @IsOptional()
  @IsString({ message: 'Variant name must be a string' })
  variantName?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter active tickets by kitchen station ID (optional)',
  })
  @IsOptional()
  @IsInt({ message: 'Station ID must be an integer' })
  stationId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Number of units cooked/prepared to distribute (defaults to 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Bump quantity must be an integer' })
  @Min(1, { message: 'Bump quantity must be at least 1' })
  bumpQuantity?: number;
}
