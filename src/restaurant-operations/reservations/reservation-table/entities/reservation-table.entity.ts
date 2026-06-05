import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';

@Entity('reservation_tables')
export class ReservationTable {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    reservation_id: number;

    @Column()
    table_id: number;

    @ManyToOne(() => Reservation, (r) => r.tables, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @ManyToOne(() => Table, {
        eager: true,
    })
    @JoinColumn({ name: 'table_id' })
    table: Table;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;
}
