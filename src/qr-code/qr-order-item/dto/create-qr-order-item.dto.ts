//src/qr-code/qr-order-item/dto/create-qr-order-item.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsIn,
} from 'class-validator';

export class CreateQROrderItemDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the QR Order related',
  })
  @IsInt()
  @IsNotEmpty()
  qrOrder: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Product related' })
  @IsInt()
  @IsNotEmpty()
  product: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant related (if applicable)',
  })
  @IsInt()
  @IsOptional()
  variant?: number;

  @ApiProperty({ example: 2, description: 'Quantity of the product ordered' })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 19.99, description: 'Price per unit of the product' })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    example: 'No onions, please',
    description: 'Additional notes or instructions for the order item',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
