import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+123456789', description: 'Supplier contact info' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsNotEmpty()
  contactInfo: string;

  @ApiProperty({
    example: true,
    description: 'Supplier status',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
