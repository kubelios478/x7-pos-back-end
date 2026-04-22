import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetReservationStatusHistoryQueryDto } from './dto/get-reservation-status-history-query.dto';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationStatusHistory } from './dto/all-paginated-reservation-status-history.dto';

import { CreateReservationStatusHistoryDto } from './dto/create-reservation-status-history.dto';
import { UpdateReservationStatusHistoryDto } from './dto/update-reservation-status-history.dto';
import { OneReservationStatusHistoryResponse, ReservationStatusHistoryResponseDto } from './dto/reservation-status-history-response.dto';

@Injectable()
export class ReservationStatusHistoryService {
  constructor(
    @InjectRepository(ReservationStatusHistory)
    private readonly historyRepository: Repository<ReservationStatusHistory>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) { }

  async create(createDto: CreateReservationStatusHistoryDto, merchantId: number): Promise<OneReservationStatusHistoryResponse> {
    await this.validateReservationOwnership(createDto.reservation_id, merchantId);

    try {
      const historyItem = new ReservationStatusHistory();
      historyItem.reservation_id = createDto.reservation_id;
      historyItem.status = createDto.status;
      historyItem.changed_by = createDto.changed_by;
      historyItem.is_active = true;

      const saved = await this.historyRepository.save(historyItem);
      return {
        statusCode: 201,
        message: 'Status history entry created successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(reservationId: number, merchantId: number, page = 1, limit = 10): Promise<AllPaginatedReservationStatusHistory> {
    return this.findAllGlobal(merchantId, { reservation_id: reservationId, page, limit });
  }

  async findAllGlobal(merchantId: number, queryDto: GetReservationStatusHistoryQueryDto): Promise<AllPaginatedReservationStatusHistory> {
    const { page = 1, limit = 10, reservation_id, status } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      reservation: { merchant_id: merchantId }
    };

    if (reservation_id) where.reservation_id = reservation_id;
    if (status) where.status = status;

    const [data, total] = await this.historyRepository.findAndCount({
      where,
      relations: ['reservation'],
      skip,
      take: limit,
      order: { changed_at: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'All merchant status history retrieved successfully',
      data: data.map(h => this.mapToResponseDto(h)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: number, merchantId: number): Promise<OneReservationStatusHistoryResponse> {
    const history = await this.historyRepository.findOne({
      where: { id, is_active: true },
      relations: ['reservation'],
    });

    if (!history || history.reservation.merchant_id !== merchantId) {
      ErrorHandler.notFound('Status history entry not found');
    }

    return {
      statusCode: 200,
      message: 'Status history entry retrieved successfully',
      data: this.mapToResponseDto(history),
    };
  }

  async update(id: number, updateDto: UpdateReservationStatusHistoryDto, merchantId: number): Promise<OneReservationStatusHistoryResponse> {
    await this.findOne(id, merchantId);
    const history = await this.historyRepository.findOneBy({ id });

    if (!history) {
      ErrorHandler.notFound('Status history entry not found');
    }

    Object.assign(history, updateDto);
    try {
      const saved = await this.historyRepository.save(history);
      return {
        statusCode: 200,
        message: 'Status history entry updated successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(id: number, merchantId: number): Promise<OneReservationStatusHistoryResponse> {
    await this.findOne(id, merchantId);
    const history = await this.historyRepository.findOneBy({ id });

    if (!history) {
      ErrorHandler.notFound('Status history entry not found');
    }

    history.is_active = false;
    const saved = await this.historyRepository.save(history);

    return {
      statusCode: 200,
      message: 'Status history entry removed successfully',
      data: this.mapToResponseDto(saved),
    };
  }

  private mapToResponseDto(history: ReservationStatusHistory): ReservationStatusHistoryResponseDto {
    return {
      id: history.id,
      reservation_id: history.reservation_id,
      status: history.status,
      changed_at: history.changed_at,
      changed_by: history.changed_by,
      is_active: history.is_active,
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
