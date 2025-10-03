import { ApiProperty } from '@nestjs/swagger';

export class DeleteSubPlanResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Subscription plan deleted successfully' })
  message: string;
}
