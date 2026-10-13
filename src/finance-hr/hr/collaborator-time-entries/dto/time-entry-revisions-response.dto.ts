import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { TimeEntryRevision } from '../entities/time-entry-revision.entity';

export class TimeEntryRevisionsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [TimeEntryRevision] })
  data: TimeEntryRevision[];
}
