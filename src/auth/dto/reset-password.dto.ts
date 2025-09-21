// src/auth/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class ResetPasswordDto {
  @ApiProperty({
    example: 'uuid-token',
    description: 'Token to be sent to user email address',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'newStrongPassword123',
    description: 'New user password to set for the user',
  })
  @IsString()
  newPassword: string;
}
