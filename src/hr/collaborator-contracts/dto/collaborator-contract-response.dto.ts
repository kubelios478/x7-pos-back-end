import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { ContractType } from '../constants/contract-type.enum';

export class CollaboratorContractResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  company_id: number;

  @ApiProperty({ example: 1 })
  merchant_id: number;

  @ApiProperty({ example: 1 })
  collaborator_id: number;

  @ApiProperty({ enum: ContractType })
  contract_type: ContractType;

  @ApiProperty({ example: 500000 })
  base_salary: number;

  @ApiProperty({ example: 5000 })
  hourly_rate: number;

  @ApiProperty({ example: 1.5 })
  overtime_multiplier: number;

  @ApiProperty({ example: 2.0 })
  double_overtime_multiplier: number;

  @ApiProperty({ example: false })
  tips_included_in_payroll: boolean;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2024-01-01' })
  start_date: string;

  @ApiProperty({ example: '2025-12-31', nullable: true })
  end_date: string | null;

  @ApiProperty()
  created_at: string;
}

export class OneCollaboratorContractResponseDto extends SuccessResponse {
  @ApiProperty({ type: CollaboratorContractResponseDto })
  data: CollaboratorContractResponseDto;
}
