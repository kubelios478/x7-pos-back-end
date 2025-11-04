import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateMovementDto {
  @ApiProperty({
    example: 1,
    description: 'Stock Item ID associated with the movement',
  })
  @IsNotEmpty()
  @IsInt()
  stockItemId: number;

  @ApiProperty({ example: 10, description: 'Quantity of the movement' })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({
    example: 'entry',
    description: 'Type of movement (entry/exit)',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    example: 'REF-001',
    description: 'Movement reference (optional)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
