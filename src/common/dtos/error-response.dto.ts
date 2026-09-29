import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: ['name must not be empty'],
    description: 'Error message(s)',
    type: [String],
  })
  message: string | string[];

  // Nest lo incluye en 401/403/404; el filtro de 400 no lo emite
  @ApiPropertyOptional({ example: 'Bad Request', description: 'Error type' })
  error?: string;

  // Solo en 400 con varias reglas de validación fallidas
  @ApiPropertyOptional({
    example: [
      'orderId must be a number conforming to the specified constraints',
    ],
    description: 'Validation errors (400 with several failed rules only)',
    type: [String],
  })
  errors?: string[];

  // Lo añade ValidationExceptionFilter en todas las respuestas 400
  @ApiPropertyOptional({
    example: '2026-09-27T12:00:00.000Z',
    description: 'Timestamp added by the global 400 filter',
  })
  timestamp?: string;
}
