//src/subscriptions/applications/dto/application-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ApplicationEntity } from '../entity/application-entity';

export class ApplicationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'My Application' })
  name: string;

  @ApiProperty({ example: 'This is the sample application' })
  description: string;

  @ApiProperty({ example: 'Utilities' })
  category: string;

  @ApiProperty({ example: 'active' })
  status: string;
}

export class OneApplicationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: ApplicationEntity;
}

export class AllApplicationResponseDto extends SuccessResponse {
  @ApiProperty()
  data: ApplicationEntity[];
}
