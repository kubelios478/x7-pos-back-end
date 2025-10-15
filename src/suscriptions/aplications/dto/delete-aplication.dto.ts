import { ApiProperty } from '@nestjs/swagger';

export class DeleteAplicationDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Aplication deleted successfully' })
  message: string;
}
