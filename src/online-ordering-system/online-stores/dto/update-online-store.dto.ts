import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateOnlineStoreDto } from './create-online-store.dto';

export class UpdateOnlineStoreDto extends PartialType(CreateOnlineStoreDto) {
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the online store is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
