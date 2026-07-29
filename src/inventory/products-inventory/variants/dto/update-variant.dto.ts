import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['productId'] as const),
) {
  @ApiProperty({ example: true, description: 'Variant active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
