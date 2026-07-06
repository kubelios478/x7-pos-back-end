import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

@Entity('reservation_guests')
export class ReservationGuest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  reservation_id: number;

  @ManyToOne(() => Reservation, (r) => r.guests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ default: false })
  is_primary: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
