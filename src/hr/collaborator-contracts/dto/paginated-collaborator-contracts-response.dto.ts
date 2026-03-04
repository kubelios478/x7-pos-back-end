import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { CollaboratorContractResponseDto } from './collaborator-contract-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}

export class PaginatedCollaboratorContractsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [CollaboratorContractResponseDto] })
  data: CollaboratorContractResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  paginationMeta: PaginationMetaDto;
}
