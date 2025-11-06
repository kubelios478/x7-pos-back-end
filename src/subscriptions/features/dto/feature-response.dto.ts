//src/subscriptions/features/dto/feature-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { FeatureEntity } from '../entity/features.entity';

export class FeatureResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'New Feature' })
  name: string;

  @ApiProperty({ example: 'This is the sample feature' })
  description: string;

  @ApiProperty({ example: 'This is the sample feature unit' })
  unit: string;
}

export class OneFeatureResponseDto extends SuccessResponse {
  @ApiProperty()
  data: FeatureEntity;
}

export class AllFeatureResponseDto extends SuccessResponse {
  @ApiProperty()
  data: FeatureEntity[];
}
