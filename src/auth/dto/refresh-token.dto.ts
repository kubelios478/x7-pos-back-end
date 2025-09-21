// dto/refresh-token.dto.ts
import { ApiProperty } from '@nestjs/swagger';
export class RefreshTokenDto {
  @ApiProperty({
    example: 'uuid-token',
    description: 'Token to be sent to user email',
  })
  refreshToken: string;
}
