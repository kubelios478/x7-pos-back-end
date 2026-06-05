import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ReservationStatus } from '../../reservation/constants/reservation.constants';

@Entity('reservation_status_history')
export class ReservationStatusHistory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    reservation_id: number;

    @ManyToOne(() => Reservation, (r) => r.statusHistory, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.PENDING,
    })
    status: ReservationStatus;

    @Column({ nullable: true })
    changed_by: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn()
    changed_at: Date;
}
