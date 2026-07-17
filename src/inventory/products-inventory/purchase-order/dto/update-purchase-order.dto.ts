import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto extends PartialType(
  CreatePurchaseOrderDto,
) {
  @ApiPropertyOptional({ example: true, description: 'Estatus de la orden en el sistema' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
