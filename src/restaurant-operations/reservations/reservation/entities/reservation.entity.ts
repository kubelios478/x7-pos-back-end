import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { ReservationStatus } from '../constants/reservation.constants';
import { ReservationGuest } from 'src/restaurant-operations/reservations/reservation-guest/entities/reservation-guest.entity';
import { ReservationTable } from 'src/restaurant-operations/reservations/reservation-table/entities/reservation-table.entity';
import { ReservationNote } from 'src/restaurant-operations/reservations/reservation-note/entities/reservation-note.entity';
import { ReservationStatusHistory } from 'src/restaurant-operations/reservations/reservation-status-history/entities/reservation-status-history.entity';

@Entity('reservations')
@Index(['merchant_id', 'reservation_date'])
export class Reservation {
    @ApiProperty({ example: 1 })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 1 })
    @Column({ name: 'merchant_id' })
    merchant_id: number;

    @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'merchant_id' })
    merchant: Merchant;

    @ApiPropertyOptional({ example: 1 })
    @Column({ name: 'customer_id', nullable: true })
    customer_id: number | null;

    @ManyToOne(() => Customer, { nullable: true })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer | null;

    @ApiProperty({ example: '2026-04-16T19:00:00Z' })
    @Column({ type: 'timestamp' })
    reservation_date: Date;

    @ApiProperty({ example: 90 })
    @Column({ type: 'int', default: 90 })
    duration_minutes: number;

    @ApiPropertyOptional({ example: '2026-04-16T19:05:00Z' })
    @Column({ type: 'timestamp', nullable: true })
    seated_at: Date;

    @ApiProperty({ example: 4 })
    @Column({ type: 'int' })
    party_size: number;

    @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.PENDING })
    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.PENDING,
        name: 'ReservationStatus',
    })
    status: ReservationStatus;

    @ApiPropertyOptional({ example: 'phone', description: 'phone, online, qr, walk_in' })
    @Column({ type: 'varchar', length: 20, nullable: true })
    source: string;

    @ApiPropertyOptional({ example: 'Happy birthday!', description: 'Special requests' })
    @Column({ type: 'text', nullable: true })
    special_requests: string;

    @ApiPropertyOptional({ example: 1, description: 'Collaborator ID' })
    @Column({ nullable: true })
    created_by: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    // Relaciones
    @OneToMany(() => ReservationGuest, (guest) => guest.reservation)
    guests: ReservationGuest[];

    @OneToMany(() => ReservationTable, (table) => table.reservation)
    tables: ReservationTable[];

    @OneToMany(() => ReservationNote, (note) => note.reservation)
    notes: ReservationNote[];

    @OneToMany(() => ReservationStatusHistory, (history) => history.reservation)
    statusHistory: ReservationStatusHistory[];
}
