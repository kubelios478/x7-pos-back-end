import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CreateOnlineStoreDto } from './create-online-store.dto';
import { OnlineStoreStatus } from '../constants/online-store-status.enum';

export class UpdateOnlineStoreDto extends PartialType(CreateOnlineStoreDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the online store is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: OnlineStoreStatus,
    example: OnlineStoreStatus.ACTIVE,
    description: 'Logical status of the online store (active or deleted)',
  })
  @IsOptional()
  @IsEnum(OnlineStoreStatus)
  status?: OnlineStoreStatus;
}
