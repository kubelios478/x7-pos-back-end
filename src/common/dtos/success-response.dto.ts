import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponse {
  @ApiProperty({ example: 201, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: ['Company created successfully'],
    description: 'Success message(s)',
    type: [String],
  })
  message: string | string[];
}
