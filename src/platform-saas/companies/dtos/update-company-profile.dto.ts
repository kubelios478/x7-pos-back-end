import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { IsBusinessEmail } from '../../../common/decorators/validation.decorators';

export class UpdateCompanyProfileDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @ApiProperty({ example: 'Acme Corp' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '12.345.678-123' })
  rut: string;

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
