import { ApiProperty } from '@nestjs/swagger';

export class AplicationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'My Aplication' })
  name: string;

  @ApiProperty({ example: 'This is the sample aplication' })
  description: string;

  @ApiProperty({ example: 'Utilities' })
  category: string;

  @ApiProperty({ example: 'active' })
  status: string;
}
