// src/subscriptions/subscription-application/dto/subscription-application-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionApplication } from '../entity/subscription-application.entity';

export class SubscriptionApplicationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: { id: 1, name: 'Application' } })
  applicationId: { id: number; name: string };

  @ApiProperty({ example: { id: 1, name: 'Subscription Plan' } })
  merchantSubscriptionId: { id: number; name: string };

  @ApiProperty({ example: 'active' })
  status: string;
}

export class OneSubscriptionApplicationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionApplication;
}

export class AllSubscriptionApplicationsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionApplication[];
}
