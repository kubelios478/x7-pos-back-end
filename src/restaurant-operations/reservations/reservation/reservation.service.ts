import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { ReservationTable } from 'src/restaurant-operations/reservations/reservation-table/entities/reservation-table.entity';
import { ReservationStatusHistory } from 'src/restaurant-operations/reservations/reservation-status-history/entities/reservation-status-history.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { GetReservationsQueryDto } from './dto/get-reservations-query.dto';
import {
  OneReservationResponse,
  ReservationResponseDto,
} from './dto/reservation-response.dto';
import { AllPaginatedReservations } from './dto/all-paginated-reservations.dto';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ReservationStatus } from './constants/reservation.constants';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(ReservationTable)
    private readonly reservationTableRepository: Repository<ReservationTable>,
    @InjectRepository(ReservationStatusHistory)
    private readonly statusHistoryRepository: Repository<ReservationStatusHistory>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) { }

  async create(
    merchantId: number,
    createReservationDto: CreateReservationDto,
  ): Promise<OneReservationResponse> {
    const { table_ids, ...reservationData } = createReservationDto;

    try {
      const newReservation = this.reservationRepository.create({
        ...reservationData,
        merchant_id: merchantId,
        reservation_date: new Date(createReservationDto.reservation_date),
        status: createReservationDto.status || ReservationStatus.PENDING,
      });

      const savedReservation = await this.reservationRepository.save(newReservation);

      // Save associated tables if provided
      if (table_ids && table_ids.length > 0) {
        const tables = await this.tableRepository.findBy({
          id: In(table_ids),
          merchant_id: merchantId,
        });

        const reservationTables = tables.map((table) =>
          this.reservationTableRepository.create({
            reservation_id: savedReservation.id,
            table_id: table.id,
          }),
        );

        await this.reservationTableRepository.save(reservationTables);
      }

      // Initial status history
      await this.statusHistoryRepository.save(
        this.statusHistoryRepository.create({
          reservation_id: savedReservation.id,
          status: savedReservation.status,
          changed_by: createReservationDto['created_by'],
        }),
      );

      return this.findOne(savedReservation.id, merchantId, 'Created');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    queryBy: GetReservationsQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedReservations> {
    const page = queryBy.page || 1;
    const limit = queryBy.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.customer', 'customer')
      .leftJoinAndSelect('reservation.tables', 'reservationTables')
      .leftJoinAndSelect('reservationTables.table', 'table')
      .where('reservation.merchant_id = :merchantId', { merchantId })
      .andWhere('reservation.is_active = :isActive', { isActive: true });

    if (queryBy.customer_id) {
      queryBuilder.andWhere('reservation.customer_id = :customerId', {
        customerId: queryBy.customer_id,
      });
    }

    if (queryBy.date) {
      queryBuilder.andWhere('DATE(reservation.reservation_date) = :date', { date: queryBy.date });
    }

    const total = await queryBuilder.getCount();
    const reservations = await queryBuilder
      .orderBy('reservation.reservation_date', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const data: ReservationResponseDto[] = reservations.map((reservation) =>
      this.mapToResponseDto(reservation),
    );

    return {
      statusCode: 200,
      message: 'Reservations retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
    action?: string,
  ): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOne({
      where: { id, merchant_id: merchantId, is_active: true },
      relations: ['customer', 'merchant', 'tables', 'tables.table', 'guests', 'notes', 'statusHistory'],
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    return {
      statusCode: action === 'Created' ? 201 : 200,
      message: `Reservation ${action || 'retrieved'} successfully`,
      data: this.mapToResponseDto(reservation),
    };
  }

  async update(
    id: number,
    merchantId: number,
    updateReservationDto: UpdateReservationDto,
  ): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOneBy({
      id,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    const oldStatus = reservation.status;
    Object.assign(reservation, updateReservationDto);

    if (updateReservationDto.reservation_date) {
      reservation.reservation_date = new Date(updateReservationDto.reservation_date);
    }

    try {
      await this.reservationRepository.save(reservation);

      if (updateReservationDto.status && updateReservationDto.status !== oldStatus) {
        await this.statusHistoryRepository.save(
          this.statusHistoryRepository.create({
            reservation_id: id,
            status: updateReservationDto.status,
          }),
        );
      }

      return this.findOne(id, merchantId, 'Updated');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchantId: number): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOneBy({
      id,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    try {
      reservation.is_active = false;
      await this.reservationRepository.save(reservation);
      return {
        statusCode: 200,
        message: 'Reservation deleted successfully',
        data: this.mapToResponseDto(reservation),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async cancel(id: number, merchantId: number): Promise<OneReservationResponse> {
    const reservation = await this.reservationRepository.findOneBy({
      id,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    try {
      reservation.status = ReservationStatus.CANCELLED;
      await this.reservationRepository.save(reservation);

      // Log status change
      await this.statusHistoryRepository.save(
        this.statusHistoryRepository.create({
          reservation_id: id,
          status: ReservationStatus.CANCELLED,
        }),
      );

      return this.findOne(id, merchantId, 'Cancelled');
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  private mapToResponseDto(reservation: Reservation): ReservationResponseDto {
    return {
      id: reservation.id,
      merchant_id: reservation.merchant_id,
      customer_id: reservation.customer_id,
      reservation_date: reservation.reservation_date,
      duration_minutes: reservation.duration_minutes,
      seated_at: reservation.seated_at,
      party_size: reservation.party_size,
      status: reservation.status,
      source: reservation.source,
      special_requests: reservation.special_requests,
      created_by: reservation.created_by,
      created_at: reservation.created_at,
    };
  }
}
