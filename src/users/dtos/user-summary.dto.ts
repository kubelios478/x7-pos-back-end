// src/users/dtos/user-summary.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the User',
  })
  id: number;

  @ApiProperty({
    example: 'username123',
    description: 'Name of the User merchant',
  })
  username: string;

  @ApiProperty({
    example: 'name@domain.com',
    description: 'Email of the User',
  })
  email: string;

  @ApiProperty({
    example: 'admin',
    description: 'Email of the User',
  })
  role: string;

  @ApiProperty({
    example: 'name@domain.com',
    description: 'Email of the User',
  })
  scope: string;
}
