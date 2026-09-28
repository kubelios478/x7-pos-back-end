import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  Min,
  MaxLength,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KitchenOrderBusinessStatus } from '../constants/kitchen-order-business-status.enum';
import { KitchenCourse } from '../../kitchen-order-item/constants/kitchen-course.enum';

export class CreateKitchenOrderItemInlineDto {
  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Product ID must be a number' })
  productId?: number | null;

  @ApiPropertyOptional({ example: 'Pizza Margherita', nullable: true })
  @IsOptional()
  @IsString({ message: 'Product name must be a string' })
  productName?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Variant ID must be a number' })
  variantId?: number | null;

  @ApiPropertyOptional({ example: 'Familiar 16"', nullable: true })
  @IsOptional()
  @IsString({ message: 'Variant name must be a string' })
  variantName?: string | null;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be greater than or equal to 1' })
  quantity?: number;

  @ApiPropertyOptional({
    example: KitchenCourse.MAIN_COURSE,
    enum: KitchenCourse,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(KitchenCourse, { message: 'Course must be a valid kitchen course' })
  course?: KitchenCourse | null;

  @ApiPropertyOptional({ example: 'Extra sauce', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string | null;
}

export class CreateKitchenOrderDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Identifier of the Order (optional - either orderId or onlineOrderId must be provided)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Order ID must be a number' })
  orderId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Identifier of the Online Order (optional - either orderId or onlineOrderId must be provided)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Online order ID must be a number' })
  onlineOrderId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Kitchen Station (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Station ID must be a number' })
  stationId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Priority of the order (higher number = higher priority)',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Priority must be a number' })
  @Min(0, { message: 'Priority must be greater than or equal to 0' })
  priority?: number;

  @ApiPropertyOptional({
    example: KitchenOrderBusinessStatus.PENDING,
    enum: KitchenOrderBusinessStatus,
    description: 'Business status of the kitchen order',
    required: false,
    default: KitchenOrderBusinessStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(KitchenOrderBusinessStatus, {
    message: 'Business status must be a valid kitchen order status',
  })
  businessStatus?: KitchenOrderBusinessStatus;

  @ApiPropertyOptional({
    example: '2024-01-15T08:30:00Z',
    description: 'Timestamp when the order was started',
    nullable: true,
    required: false,
  })
  @IsOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional({
    example: '2024-01-15T09:00:00Z',
    description: 'Timestamp when the order was completed',
    nullable: true,
    required: false,
  })
  @IsOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional({
    example: 'Extra sauce on the side',
    description: 'Notes about the kitchen order',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string | null;

  @ApiPropertyOptional({
    description:
      'Si es true, no se generan kitchen order items desde las líneas POS (compatibilidad). Por defecto false.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipAutoKitchenItems?: boolean;

  @ApiPropertyOptional({
    type: () => [CreateKitchenOrderItemInlineDto],
    description: 'Inline items to include in the kitchen order directly',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKitchenOrderItemInlineDto)
  kitchenOrderItems?: CreateKitchenOrderItemInlineDto[];
}
