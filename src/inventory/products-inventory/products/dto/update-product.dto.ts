import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiProperty({ example: true, description: 'Product active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
