import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

@Entity('reservation_notes')
export class ReservationNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reservation_id: number;

  @ManyToOne(() => Reservation, (r) => r.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ type: 'text' })
  note: string;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
