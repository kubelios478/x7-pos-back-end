// src/users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  MinLength,
  IsNumber,
  IsEmail,
  IsOptional,
  Length,
} from 'class-validator';
import { UserRole } from '../constants/role.enum';
import { Scope } from '../constants/scope.enum';

export class CreateUserDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'Username of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 60, { message: 'Username must be between 2 and 60 characters' })
  username?: string;

  @ApiProperty({
    example: 'securePass123',
    description: 'Password for the user account',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserRole, description: 'Role assigned to the user' })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ enum: Scope, description: 'Access scope of the user' })
  @IsEnum(Scope)
  scope: Scope;

  @ApiProperty({
    example: 1,
    description: 'ID of the associated company',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  companyId?: number;

  @ApiProperty({
    example: 1,
    description:
      'ID of the associated merchant. Ignored for merchant admins (forced to their own merchant).',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  merchantId?: number;
}
