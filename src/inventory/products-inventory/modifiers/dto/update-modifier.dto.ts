import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { CreateModifierDto } from './create-modifier.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateModifierDto extends PartialType(
  OmitType(CreateModifierDto, ['productId'] as const),
) {
  @ApiProperty({ example: true, description: 'Modifier active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
