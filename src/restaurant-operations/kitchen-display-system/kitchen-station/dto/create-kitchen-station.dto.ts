import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { KitchenStationType } from '../constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from '../constants/kitchen-display-mode.enum';

export class CreateKitchenStationDto {
  @ApiProperty({
    example: 'Hot Station 1',
    description: 'Name of the kitchen station',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: KitchenStationType.HOT,
    enum: KitchenStationType,
    description: 'Type of the kitchen station',
  })
  @IsEnum(KitchenStationType)
  @IsNotEmpty()
  stationType: KitchenStationType;

  @ApiProperty({
    example: KitchenDisplayMode.AUTO,
    enum: KitchenDisplayMode,
    description: 'Display mode of the kitchen station',
  })
  @IsEnum(KitchenDisplayMode)
  @IsNotEmpty()
  displayMode: KitchenDisplayMode;

  @ApiProperty({
    example: 1,
    description: 'Display order for sorting',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  displayOrder: number;

  @ApiPropertyOptional({
    example: 'Kitchen Printer 1',
    description: 'Name of the printer associated with this station',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  printerName?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'ID of the secondary backup station for offline or overload rerouting',
  })
  @IsOptional()
  @IsNumber()
  backupStationId?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Maximum active ticket capacity threshold before triggering load balancing overflow',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxActiveTicketsCapacity?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Automatically reroute orders when all station devices are offline > 60s',
  })
  @IsOptional()
  autoRerouteOnOffline?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Automatically balance load and reroute overflow orders when capacity limit is breached',
  })
  @IsOptional()
  autoRerouteOnCapacity?: boolean;

  @ApiPropertyOptional({
    example: 'BACKUP_STATION',
    description: 'Fallback action: BACKUP_STATION, THERMAL_PRINTER, or BOTH',
  })
  @IsOptional()
  @IsString()
  fallbackAction?: string;
}
