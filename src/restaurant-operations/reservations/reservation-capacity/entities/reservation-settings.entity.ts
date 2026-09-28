import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ServiceShift } from '../constants/capacity.constants';

/**
 * Configuración de aforo y ritmo de reservas de un comercio (una fila por comercio). Todo es
 * opcional: un comercio sin fila usa los turnos por defecto, el aforo calculado desde sus
 * mesas y ningún límite de llegadas.
 *
 * Con `synchronize: false` la tabla se crea con scripts/add-reservation-capacity.sql.
 */
@Entity('reservation_settings')
export class ReservationSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  merchant_id: number;

  /** Aforo total del comedor; null = suma de sillas de las mesas activas. */
  @Column({ type: 'int', nullable: true })
  seat_capacity: number | null;

  /** Tamaño de franja del selector y del límite de llegadas: 15 o 30 minutos. */
  @Column({ type: 'int', default: 15 })
  slot_interval_minutes: number;

  /** Máximo de comensales que pueden LLEGAR en una misma franja; null = sin límite. */
  @Column({ type: 'int', nullable: true })
  max_covers_per_slot: number | null;

  @Column({ type: 'jsonb', nullable: true })
  shifts: ServiceShift[] | null;

  @Column({ type: 'int', nullable: true })
  updated_by: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
