import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OfflineActionType {
  BUMP_ORDER = 'BUMP_ORDER',
  RECALL_ORDER = 'RECALL_ORDER',
  UPDATE_ITEM_STATUS = 'UPDATE_ITEM_STATUS',
  INCREMENT_ITEM_QTY = 'INCREMENT_ITEM_QTY',
  FIRE_ITEM = 'FIRE_ITEM',
  FIRE_COURSE = 'FIRE_COURSE',
  BATCH_BUMP_FIFO = 'BATCH_BUMP_FIFO',
}

export class OfflineKitchenActionDto {
  @ApiProperty({
    example: OfflineActionType.BUMP_ORDER,
    enum: OfflineActionType,
    description: 'Type of offline action queued by the KDS screen',
  })
  @IsString()
  actionType: string;

  @ApiPropertyOptional({ example: 4, description: 'Target Kitchen Order ID' })
  @IsOptional()
  @IsNumber()
  kitchenOrderId?: number;

  @ApiPropertyOptional({ example: 12, description: 'Target Kitchen Order Item ID' })
  @IsOptional()
  @IsNumber()
  kitchenOrderItemId?: number;

  @ApiPropertyOptional({ example: 'ready', description: 'Item preparation status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 2, description: 'Prepared quantity' })
  @IsOptional()
  @IsNumber()
  preparedQuantity?: number;

  @ApiPropertyOptional({ example: 'main_course', description: 'Course name' })
  @IsOptional()
  @IsString()
  course?: string;

  @ApiPropertyOptional({ example: 'Burger', description: 'Product name for batch bump' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ example: 1, description: 'Quantity bumped' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ example: 6, description: 'Station ID for station isolation' })
  @IsOptional()
  @IsNumber()
  stationId?: number;

  @ApiPropertyOptional({ example: 'Con Queso Cheddar', description: 'Variant name' })
  @IsOptional()
  @IsString()
  variantName?: string;

  @ApiPropertyOptional({
    example: '2026-09-24T19:50:00.000Z',
    description: 'Original timestamp when the action occurred offline',
  })
  @IsOptional()
  @IsString()
  clientTimestamp?: string;
}

export class SyncKitchenEventsDto {
  @ApiProperty({
    type: [OfflineKitchenActionDto],
    description: 'List of offline queued kitchen actions in chronological order',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineKitchenActionDto)
  actions: OfflineKitchenActionDto[];
}
