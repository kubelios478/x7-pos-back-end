import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { UserSafeDto } from './user-safe.dto';
import { OptionalPaginatedResponse } from 'src/common/dtos/optional-paginated-response.dto';

export class OneUserResponseDto extends SuccessResponse {
  @ApiProperty()
  data: UserSafeDto;
}

export class AllUsersResponseDto extends OptionalPaginatedResponse {
  @ApiProperty()
  data: UserSafeDto[];
}
