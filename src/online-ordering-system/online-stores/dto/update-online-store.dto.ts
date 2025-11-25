import { PartialType } from '@nestjs/swagger';
import { CreateOnlineStoreDto } from './create-online-store.dto';

export class UpdateOnlineStoreDto extends PartialType(CreateOnlineStoreDto) {}
