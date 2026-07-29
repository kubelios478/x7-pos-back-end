// src/platform-saas/users/dtos/user-hr-summary.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { UserSafeDto } from './user-safe.dto';

export class HrCollaboratorDto {
  @ApiProperty({ example: 1, description: 'Collaborator record id' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: 'Full name on the HR record' })
  name: string;

  @ApiProperty({
    example: 'EMP-00123',
    description: 'Internal employee identifier',
    nullable: true,
  })
  employeeId: string | null;

  @ApiProperty({
    example: 'Kitchen',
    description: 'Department the collaborator belongs to',
    nullable: true,
  })
  department: string | null;

  @ApiProperty({ example: 'cook', description: 'Operational shift role' })
  role: string;

  @ApiProperty({ example: 'active', description: 'Collaborator status' })
  status: string;

  @ApiProperty({ example: 5, description: 'Merchant the collaborator belongs to' })
  merchantId: number;
}

export class UserHrSummaryDataDto {
  @ApiProperty({ type: () => UserSafeDto })
  user: UserSafeDto;

  @ApiProperty({ type: () => HrCollaboratorDto, isArray: true })
  collaborators: HrCollaboratorDto[];
}

export class UserHrSummaryResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => UserHrSummaryDataDto })
  data: UserHrSummaryDataDto;
}
