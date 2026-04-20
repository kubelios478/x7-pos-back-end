import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationTableDto } from './dto/create-reservation-table.dto';
import { ReservationTable } from './entities/reservation-table.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationTables } from './dto/all-paginated-reservation-tables.dto';

import { OneReservationTableResponse, ReservationTableResponseDto } from './dto/reservation-table-response.dto';
import { GetReservationTablesQueryDto } from './dto/get-reservation-tables-query.dto';

@Injectable()
export class ReservationTableService {
  constructor(
    @InjectRepository(ReservationTable)
    private readonly reservationTableRepository: Repository<ReservationTable>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
  ) { }

  async create(createDto: CreateReservationTableDto, merchantId: number): Promise<OneReservationTableResponse> {
    await this.validateReservationOwnership(createDto.reservation_id, merchantId);

    const table = await this.tableRepository.findOneBy({ id: createDto.table_id, merchant_id: merchantId });
    if (!table) {
      ErrorHandler.notFound('Table not found');
    }

    const existing = await this.reservationTableRepository.findOneBy({
      reservation_id: createDto.reservation_id,
      table_id: createDto.table_id,
      is_active: true,
    });

    if (existing) {
      return {
        statusCode: 200,
        message: 'Table already assigned',
        data: this.mapToResponseDto(existing),
      };
    }

    try {
      const resTable = this.reservationTableRepository.create(createDto);
      const saved = await this.reservationTableRepository.save(resTable);
      return {
        statusCode: 201,
        message: 'Table assignment created successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(reservationId: number, merchantId: number, page = 1, limit = 10): Promise<AllPaginatedReservationTables> {
    return this.findAllGlobal(merchantId, { reservation_id: reservationId, page, limit });
  }

  async findAllGlobal(merchantId: number, queryDto: GetReservationTablesQueryDto): Promise<AllPaginatedReservationTables> {
    const { page = 1, limit = 10, reservation_id, table_id } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      reservation: { merchant_id: merchantId }
    };

    if (reservation_id) where.reservation_id = reservation_id;
    if (table_id) where.table_id = table_id;

    const [data, total] = await this.reservationTableRepository.findAndCount({
      where,
      relations: ['reservation', 'table'],
      skip,
      take: limit,
      order: { reservation_id: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'All merchant reservation tables retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async remove(reservationId: number, tableId: number, merchantId: number): Promise<OneReservationTableResponse> {
    await this.validateReservationOwnership(reservationId, merchantId);

    const resTable = await this.reservationTableRepository.findOneBy({
      reservation_id: reservationId,
      table_id: tableId,
      is_active: true,
    });

    if (!resTable) {
      ErrorHandler.notFound('Table assignment not found');
    }

    resTable.is_active = false;
    const saved = await this.reservationTableRepository.save(resTable);
    return {
      statusCode: 200,
      message: 'Table assignment removed successfully',
      data: this.mapToResponseDto(saved),
    };
  }

  private mapToResponseDto(resTable: ReservationTable): ReservationTableResponseDto {
    return {
      reservation_id: resTable.reservation_id,
      table_id: resTable.table_id,
      is_active: resTable.is_active,
    };
  }

  private async validateReservationOwnership(reservationId: number, merchantId: number) {
    const reservation = await this.reservationRepository.findOneBy({
      id: reservationId,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }
  }
}
