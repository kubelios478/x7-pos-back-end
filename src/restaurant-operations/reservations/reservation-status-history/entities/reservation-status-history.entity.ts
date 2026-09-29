import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ReservationStatus } from '../../reservation/constants/reservation.constants';

/**
 * Histórico INMUTABLE de transiciones de una reserva: sólo se inserta (lo hace
 * ReservationService en la misma transacción que cambia el estado) y se lee. No hay DTO de
 * escritura ni ruta de edición; el controlador responde 405 a PUT/PATCH/DELETE.
 *
 * El índice cubre la consulta del feed, que filtra por reserva y ordena por changed_at. Con
 * `synchronize: false` no lo crea TypeORM: se aplica con
 * scripts/add-reservation-status-history-index.sql (mismo nombre).
 */
@Entity('reservation_status_history')
@Index('IDX_reservation_status_history_reservation_changed_at', [
  'reservation_id',
  'changed_at',
])
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

  /** Usuario del JWT que hizo el cambio; `null` = proceso automático del sistema. */
  @Column({ type: 'int', nullable: true })
  changed_by: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  changed_at: Date;
}
