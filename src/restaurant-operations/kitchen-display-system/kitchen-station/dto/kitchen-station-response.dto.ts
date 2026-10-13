import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { KitchenStationType } from '../constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from '../constants/kitchen-display-mode.enum';
import { KitchenStationStatus } from '../constants/kitchen-station-status.enum';

export class KitchenStationResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Kitchen Station',
  })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Kitchen Station',
  })
  merchantId: number;

  @ApiProperty({
    description: 'Basic merchant information',
    example: {
      id: 1,
      name: 'Restaurant ABC',
    },
  })
  merchant: {
    id: number;
    name: string;
  };

  @ApiProperty({
    example: 'Hot Station 1',
    description: 'Name of the kitchen station',
  })
  name: string;

  @ApiProperty({
    example: KitchenStationType.HOT,
    enum: KitchenStationType,
    description: 'Type of the kitchen station',
  })
  stationType: KitchenStationType;

  @ApiProperty({
    example: KitchenDisplayMode.AUTO,
    enum: KitchenDisplayMode,
    description: 'Display mode of the kitchen station',
  })
  displayMode: KitchenDisplayMode;

  @ApiProperty({
    example: 1,
    description: 'Display order for sorting',
  })
  displayOrder: number;

  @ApiProperty({
    example: 1,
    description: 'Sequential station number scoped to the merchant',
  })
  stationNumber: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Sequential station number scoped to the merchant (snake_case alias)',
  })
  station_number?: number;

  @ApiPropertyOptional({
    example: 'Kitchen Printer 1',
    description: 'Name of the printer associated with this station',
  })
  printerName?: string | null;

  @ApiPropertyOptional({
    example: 'Kitchen Printer 1',
    description: 'Snake_case alias for printerName',
  })
  printer_name?: string | null;

  @ApiPropertyOptional({
    example: 10,
    description: 'ID of the secondary backup station for offline or overload rerouting',
  })
  backupStationId?: number | null;

  @ApiPropertyOptional({
    example: 10,
    description: 'Snake_case alias for backupStationId',
  })
  backup_station_id?: number | null;

  @ApiPropertyOptional({
    example: 15,
    description: 'Maximum active ticket capacity threshold before triggering load balancing overflow',
  })
  maxActiveTicketsCapacity?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Snake_case alias for maxActiveTicketsCapacity',
  })
  max_active_tickets_capacity?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to auto-reroute when station devices are offline > 60s',
  })
  autoRerouteOnOffline?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Snake_case alias for autoRerouteOnOffline',
  })
  auto_reroute_on_offline?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to auto-balance load when capacity limit is breached',
  })
  autoRerouteOnCapacity?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Snake_case alias for autoRerouteOnCapacity',
  })
  auto_reroute_on_capacity?: boolean;

  @ApiPropertyOptional({
    example: 'BACKUP_STATION',
    description: 'Fallback action: BACKUP_STATION, THERMAL_PRINTER, or BOTH',
  })
  fallbackAction?: string;

  @ApiPropertyOptional({
    example: 'BACKUP_STATION',
    description: 'Snake_case alias for fallbackAction',
  })
  fallback_action?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the kitchen station is active',
  })
  isActive: boolean;

  @ApiProperty({
    example: KitchenStationStatus.ACTIVE,
    enum: KitchenStationStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: KitchenStationStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Kitchen Station record',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Kitchen Station record',
  })
  updatedAt: Date;
}

export class OneKitchenStationResponseDto extends SuccessResponse {
  @ApiProperty({ type: KitchenStationResponseDto })
  data: KitchenStationResponseDto;
}
