import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: ['name must not be empty'],
    description: 'Error message(s)',
    type: [String],
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request', description: 'Error type' })
  error: string;
}
