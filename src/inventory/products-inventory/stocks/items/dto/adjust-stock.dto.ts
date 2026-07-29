import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 10, description: 'Cantidad absoluta o delta relativo a ajustar (puede ser negativo si es relativo)' })
  @IsNotEmpty()
  @IsInt()
  value: number;

  @ApiProperty({ example: 'absolute', description: 'Tipo de ajuste: absolute o relative' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['absolute', 'relative'])
  type: 'absolute' | 'relative';

  @ApiPropertyOptional({ example: 'Corrección física', description: 'Razón del ajuste' })
  @IsOptional()
  @IsString()
  reason?: string;
}
