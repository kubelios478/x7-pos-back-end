import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { ShiftRole } from '../constants/shift-role.enum';
import { ShiftStatus } from '../constants/shift-status.enum';
import { ShiftAssignment } from '../../shift-assignments/entities/shift-assignment.entity';
import { TableAssignment } from '../../table-assignments/entities/table-assignment.entity';

@Entity()
export class Shift {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Shift' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Merchant ID associated with the shift' })
  @Column()
  merchantId: number;

  @ApiProperty({ 
    example: '2024-01-15T08:00:00Z', 
    description: 'Start time of the shift' 
  })
  @Column({ type: 'timestamp' })
  startTime: Date;

  @ApiProperty({ 
    example: '2024-01-15T16:00:00Z', 
    description: 'End time of the shift' 
  })
  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @ApiProperty({ 
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the person working the shift' 
  })
  @Column({ 
    type: 'enum', 
    enum: ShiftRole,
    default: ShiftRole.WAITER
  })
  role: ShiftRole;

  @ApiProperty({ 
    enum: ShiftStatus,
    example: ShiftStatus.ACTIVE,
    description: 'Current status of the shift' 
  })
  @Column({ 
    type: 'enum', 
    enum: ShiftStatus,
    default: ShiftStatus.ACTIVE
  })
  status: ShiftStatus;

  @ApiProperty({
    type: () => Merchant,
    description: 'Merchant associated with the shift',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.shifts, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({
    type: () => ShiftAssignment,
    isArray: true,
    required: false,
    description: 'List of shift assignments for this shift',
  })
  @OneToMany(() => ShiftAssignment, (shiftAssignment) => shiftAssignment.shift)
  shiftAssignments: ShiftAssignment[];

  @ApiProperty({
    type: () => TableAssignment,
    isArray: true,
    required: false,
    description: 'List of table assignments for this shift',
  })
  @OneToMany(() => TableAssignment, (tableAssignment) => tableAssignment.shift)
  tableAssignments: TableAssignment[];
}
