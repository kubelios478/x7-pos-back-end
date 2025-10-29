import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { MerchantResponseDto } from 'src/merchants/dtos/merchant-response.dto';

export class LocationResponseDto {
  @ApiProperty({ example: 1, description: 'Location ID' })
  id: number;

  @ApiProperty({ example: 'New York', description: 'Location name' })
  name: string;

  @ApiProperty({ example: '123 Main St', description: 'Location address' })
  address: string;

  @ApiProperty({
    type: () => MerchantResponseDto,
    nullable: true,
    description: 'Associated merchant details',
  })
  merchant: MerchantResponseDto | null;
}

export class OneLocationResponse extends SuccessResponse {
  @ApiProperty()
  data: LocationResponseDto;
}
export class AllLocationResponse extends SuccessResponse {
  @ApiProperty()
  data: LocationResponseDto[];
}
