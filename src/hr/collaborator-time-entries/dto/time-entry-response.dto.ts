import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';

export class TimeEntryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  company_id: number;

  @ApiProperty({ example: 1 })
  merchant_id: number;

  @ApiProperty({ example: 1 })
  collaborator_id: number;

  @ApiProperty({ example: 1 })
  shift_id: number;

  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' })
  clock_in: string;

  @ApiProperty({ example: '2024-01-15T16:00:00.000Z', nullable: true })
  clock_out: string | null;

  @ApiProperty({ example: 8 })
  regular_hours: number;

  @ApiProperty({ example: 0 })
  overtime_hours: number;

  @ApiProperty({ example: 0 })
  double_overtime_hours: number;

  @ApiProperty({ example: false })
  approved: boolean;

  @ApiProperty()
  created_at: string;
}

export class OneTimeEntryResponseDto extends SuccessResponse {
  @ApiProperty({ type: TimeEntryResponseDto })
  data: TimeEntryResponseDto;
}
