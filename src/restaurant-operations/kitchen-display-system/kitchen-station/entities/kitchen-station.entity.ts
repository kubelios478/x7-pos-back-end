import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../../../platform-saas/merchants/entities/merchant.entity';
import { KitchenStationType } from '../constants/kitchen-station-type.enum';
import { KitchenDisplayMode } from '../constants/kitchen-display-mode.enum';
import { KitchenStationStatus } from '../constants/kitchen-station-status.enum';

@Entity('kitchen_station')
@Index(['merchant_id', 'status', 'created_at'])
export class KitchenStation {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Kitchen Station',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant owning the Kitchen Station',
  })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the kitchen station',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({
    example: 'Hot Station 1',
    description: 'Name of the kitchen station',
  })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({
    example: KitchenStationType.HOT,
    enum: KitchenStationType,
    description: 'Type of the kitchen station',
  })
  @Column({ type: 'enum', enum: KitchenStationType, name: 'station_type' })
  station_type: KitchenStationType;

  @ApiProperty({
    example: KitchenDisplayMode.AUTO,
    enum: KitchenDisplayMode,
    description: 'Display mode of the kitchen station',
  })
  @Column({ type: 'enum', enum: KitchenDisplayMode, name: 'display_mode' })
  display_mode: KitchenDisplayMode;

  @ApiProperty({
    example: 1,
    description: 'Display order for sorting',
  })
  @Column({ type: 'int', name: 'display_order' })
  display_order: number;

  @ApiProperty({
    example: 1,
    description: 'Sequential station number scoped to the merchant',
  })
  @Column({ type: 'int', name: 'station_number', default: 1 })
  station_number: number;

  @ApiProperty({
    example: 'Kitchen Printer 1',
    description: 'Name of the printer associated with this station',
    nullable: true,
  })
  @Column({
    type: 'varchar',
    length: 100,
    name: 'printer_name',
    nullable: true,
  })
  printer_name: string | null;

  @ApiProperty({
    example: 10,
    description: 'ID of the secondary backup station for offline or overload rerouting',
    nullable: true,
  })
  @Column({
    type: 'int',
    name: 'backup_station_id',
    nullable: true,
  })
  backup_station_id: number | null;

  @ManyToOne(() => KitchenStation, { nullable: true })
  @JoinColumn({ name: 'backup_station_id' })
  backup_station: KitchenStation | null;

  @ApiProperty({
    example: 15,
    description: 'Maximum active ticket capacity threshold before triggering load balancing overflow',
    default: 15,
  })
  @Column({
    type: 'int',
    name: 'max_active_tickets_capacity',
    default: 15,
  })
  max_active_tickets_capacity: number;

  @ApiProperty({
    example: true,
    description: 'Automatically reroute orders when all station devices are offline > 60 seconds',
    default: true,
  })
  @Column({
    type: 'boolean',
    name: 'auto_reroute_on_offline',
    default: true,
  })
  auto_reroute_on_offline: boolean;

  @ApiProperty({
    example: true,
    description: 'Automatically balance load and reroute overflow orders when capacity limit is breached',
    default: true,
  })
  @Column({
    type: 'boolean',
    name: 'auto_reroute_on_capacity',
    default: true,
  })
  auto_reroute_on_capacity: boolean;

  @ApiProperty({
    example: 'BACKUP_STATION',
    description: 'Fallback action: BACKUP_STATION, THERMAL_PRINTER, or BOTH',
    default: 'BACKUP_STATION',
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'fallback_action',
    default: 'BACKUP_STATION',
  })
  fallback_action: string;

  @ApiProperty({
    example: true,
    description: 'Whether the kitchen station is active',
  })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @ApiProperty({
    example: KitchenStationStatus.ACTIVE,
    enum: KitchenStationStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: KitchenStationStatus,
    default: KitchenStationStatus.ACTIVE,
  })
  status: KitchenStationStatus;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Creation timestamp of the Kitchen Station record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2023-10-01T12:00:00Z',
    description: 'Last update timestamp of the Kitchen Station record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}

/*
Table KitchenStation {
  id BIGSERIAL [pk]
  merchant_id BIGINT [ref: > Merchant.id]
  name VARCHAR(100)
  station_type kitchen_station_type
  display_mode kitchen_display_mode
  display_order INT
  printer_name VARCHAR(100)
  is_active BOOLEAN
  status ENUM('active', 'deleted')
  created_at TIMESTAMP
  updated_at TIMESTAMP
}
*/
