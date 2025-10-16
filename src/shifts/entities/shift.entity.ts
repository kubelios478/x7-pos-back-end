import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { ShiftRole } from '../constants/shift-role.enum';

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
    type: () => Merchant,
    description: 'Merchant associated with the shift',
  })
  @ManyToOne(() => Merchant, (merchant) => merchant.id, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchantId' })
  merchant: Merchant;

  @ApiProperty({ 
    example: '2024-01-15T10:30:00Z', 
    description: 'Date when the shift was created' 
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ 
    example: '2024-01-15T10:30:00Z', 
    description: 'Date when the shift was last updated' 
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
