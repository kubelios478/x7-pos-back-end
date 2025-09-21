// src/users/dtos/update-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../constants/role.enum';
import { Scope } from '../constants/scope.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'johndoe',
    description: 'Username of the user',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    example: 'john@example.com',
    description: 'Email address of the user',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'newPassword123',
    description: 'New password to be set for the user',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Updated role for the user',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    enum: Scope,
    description: 'Updated access scope for the user',
  })
  @IsOptional()
  @IsEnum(Scope)
  scope?: Scope;
}
