// src/clover/dtos/update-clover-merchant.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateCloverMerchantDto } from './create-clover-merchant.dto';

export class UpdateCloverMerchantDto extends PartialType(
  CreateCloverMerchantDto,
) {}
