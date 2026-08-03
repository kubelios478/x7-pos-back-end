// src/platform-saas/users/dtos/update-user-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: false,
    description:
      'Target active state for the user. `false` deactivates access, `true` reactivates it.',
  })
  @IsBoolean()
  isActive: boolean;
}
