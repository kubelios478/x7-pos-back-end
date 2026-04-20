import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetReservationStatusHistoryQueryDto } from './dto/get-reservation-status-history-query.dto';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationStatusHistory } from './dto/all-paginated-reservation-status-history.dto';

@Injectable()
export class ReservationStatusHistoryService {
  constructor(
    @InjectRepository(ReservationStatusHistory)
    private readonly historyRepository: Repository<ReservationStatusHistory>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) { }

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
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
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
