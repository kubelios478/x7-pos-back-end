import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { IsTaxId } from 'src/common/decorators/validation.decorators';
import { IsBusinessEmail } from '../../../common/decorators/validation.decorators';

export class UpdateCompanyProfileDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @ApiProperty({ example: 'Acme Corp' })
  name: string;

  @ApiProperty({
    example: '12-3456789',
    description: 'Tax ID of the company (e.g. US EIN 12-3456789)',
    required: true,
  })
  @ValidateIf((o: UpdateCompanyProfileDto) => o.rut === undefined)
  @IsString()
  @IsNotEmpty()
  @IsTaxId()
  tax_id?: string;

  @ApiPropertyOptional({
    example: '12-3456789',
    description: 'Deprecated: use tax_id. Accepted as an alias.',
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  @IsTaxId()
  rut?: string;

  @IsEmail()
  @IsBusinessEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'contact@acme.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[\d\s\-()]{8,20}$/)
  @ApiProperty({ example: '+1 (555) 123-4567' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 200)
  @ApiProperty({ example: '123 Main Street, Suite 100' })
  address: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @ApiProperty({ example: 'Miami' })
  city: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @ApiProperty({ example: 'California' })
  state: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @ApiProperty({ example: 'USA' })
  country: string;
}
