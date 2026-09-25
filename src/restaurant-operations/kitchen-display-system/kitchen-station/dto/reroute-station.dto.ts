import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsArray,
} from 'class-validator';

export class UpdateRerouteConfigDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'ID of the secondary backup station for offline or overload rerouting',
  })
  @IsOptional()
  @IsNumber()
  backupStationId?: number | null;

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
  @IsBoolean()
  autoRerouteOnOffline?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Automatically balance load and reroute overflow orders when capacity limit is breached',
  })
  @IsOptional()
  @IsBoolean()
  autoRerouteOnCapacity?: boolean;

  @ApiPropertyOptional({
    example: 'BACKUP_STATION',
    description: 'Fallback action: BACKUP_STATION, THERMAL_PRINTER, or BOTH',
  })
  @IsOptional()
  @IsString()
  fallbackAction?: string;

  @ApiPropertyOptional({
    example: 'Kitchen Printer 1',
    description: 'Name of the thermal printer associated with this station',
  })
  @IsOptional()
  @IsString()
  printerName?: string | null;
}

export class RerouteOrdersDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Destination station ID (defaults to station backup_station_id if omitted)',
  })
  @IsOptional()
  @IsNumber()
  targetStationId?: number;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'Specific kitchen order IDs to reroute (if omitted, reroutes all active orders of station)',
  })
  @IsOptional()
  @IsArray()
  orderIds?: number[];

  @ApiPropertyOptional({
    example: 'Device offline hardware failure',
    description: 'Operational reason for the reroute',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StationReroutingStatusDto {
  @ApiProperty({ example: 6 })
  stationId: number;

  @ApiProperty({ example: 'Hot Line & Grill Station' })
  stationName: string;

  @ApiProperty({ example: 1 })
  stationNumber: number;

  @ApiProperty({ example: 'HOT' })
  stationType: string;

  @ApiProperty({ example: 'AUTO' })
  displayMode: string;

  @ApiProperty({ example: 10, nullable: true })
  backupStationId: number | null;

  @ApiProperty({ example: 'Expo & Final Quality Check', nullable: true })
  backupStationName: string | null;

  @ApiProperty({ example: 15 })
  maxActiveTicketsCapacity: number;

  @ApiProperty({ example: 4 })
  activeTicketsCount: number;

  @ApiProperty({ example: false })
  isCapacityOverflow: boolean;

  @ApiProperty({ example: 1 })
  devicesCount: number;

  @ApiProperty({ example: 1 })
  onlineDevicesCount: number;

  @ApiProperty({ example: false })
  isDevicesOffline: boolean;

  @ApiProperty({ example: 'Kitchen Printer 1 (Grill)', nullable: true })
  printerName: string | null;

  @ApiProperty({ example: true })
  autoRerouteOnOffline: boolean;

  @ApiProperty({ example: true })
  autoRerouteOnCapacity: boolean;

  @ApiProperty({ example: 'BACKUP_STATION' })
  fallbackAction: string;

  @ApiProperty({ example: false })
  isFallbackActive: boolean;

  @ApiProperty({ example: 'NONE', enum: ['DEVICES_OFFLINE', 'CAPACITY_OVERFLOW', 'NONE'] })
  fallbackReason: 'DEVICES_OFFLINE' | 'CAPACITY_OVERFLOW' | 'NONE';
}
