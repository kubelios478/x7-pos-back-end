// src/auth/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
export class ResetPasswordDto {
  @ApiProperty({
    example: '1792860000.9f2c…',
    description: 'Token to be sent to user email address',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'newStrongPassword123',
    description: 'New user password to set for the user',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
