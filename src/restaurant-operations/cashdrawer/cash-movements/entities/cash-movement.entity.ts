import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashShift } from '../../cash-shifts/entities/cash-shift.entity';
import { User } from '../../../../platform-saas/users/entities/user.entity';
import { CashMovementType } from '../constants/cash-movement-type.enum';

@Entity('cash_movements')
export class CashMovement {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Cash Movement' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Cash Shift ID' })
  @Column({ type: 'int', name: 'shift_id' })
  shiftId: number;

  @ApiProperty({ example: 50.0, description: 'Amount of the movement' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ example: 'Meat Supplier', description: 'Reason for the expense' })
  @Column({ type: 'text' })
  reason: string;

  @ApiPropertyOptional({ example: 'https://receipt-photos/photo.jpg', description: 'Photo of the receipt' })
  @Column({ type: 'varchar', name: 'receipt_photo', nullable: true })
  receiptPhoto: string | null;

  @ApiProperty({ example: 3, description: 'User ID of the user who recorded the expense' })
  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @ApiProperty({ enum: CashMovementType, example: CashMovementType.OUTFLOW })
  @Column({
    type: 'enum',
    enum: CashMovementType,
    default: CashMovementType.OUTFLOW,
  })
  type: CashMovementType;

  @ApiProperty({ example: '2024-01-15T12:00:00Z' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => CashShift, (cs) => cs.cashMovements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  cashShift: CashShift;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
