import { ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from './success-response.dto';

/** Listado que trae los datos de paginación solo si el cliente envió page o limit. */
export class OptionalPaginatedResponse extends SuccessResponse {
  @ApiPropertyOptional({ example: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 50 })
  limit?: number;

  @ApiPropertyOptional({ example: 120 })
  total?: number;

  @ApiPropertyOptional({ example: 3 })
  totalPages?: number;

  @ApiPropertyOptional({ example: true })
  hasNext?: boolean;

  @ApiPropertyOptional({ example: false })
  hasPrev?: boolean;
}
