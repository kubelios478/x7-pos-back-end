import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { IsTaxId } from 'src/common/decorators/validation.decorators';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Coca-Cola', description: 'Supplier name' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '12-3456789',
    description:
      'Tax ID of the supplier (e.g. US EIN 12-3456789). Any country format is accepted.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @IsTaxId()
  tax_id?: string;

  @ApiProperty({
    example: 'supplier@example.com',
    description: 'Email',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @ApiProperty({
    example: '+123456789',
    description: 'Phone number',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    example: '123 Main St',
    description: 'Address',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the supplier is active',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
