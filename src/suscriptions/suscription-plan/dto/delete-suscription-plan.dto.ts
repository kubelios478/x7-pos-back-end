import { ApiProperty } from '@nestjs/swagger';

export class DeleteSuscriptionPlanDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Subscription plan deleted successfully' })
  message: string;
}
