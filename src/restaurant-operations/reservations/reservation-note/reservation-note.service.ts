import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReservationNoteDto } from './dto/create-reservation-note.dto';
import { UpdateReservationNoteDto } from './dto/update-reservation-note.dto';
import { ReservationNote } from './entities/reservation-note.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationNotes } from './dto/all-paginated-reservation-notes.dto';

import {
  OneReservationNoteResponse,
  ReservationNoteResponseDto,
} from './dto/reservation-note-response.dto';
import { GetReservationNotesQueryDto } from './dto/get-reservation-notes-query.dto';

@Injectable()
export class ReservationNoteService {
  constructor(
    @InjectRepository(ReservationNote)
    private readonly noteRepository: Repository<ReservationNote>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async create(
    createNoteDto: CreateReservationNoteDto,
    merchantId: number,
  ): Promise<OneReservationNoteResponse> {
    await this.validateReservationOwnership(
      createNoteDto.reservation_id,
      merchantId,
    );

    try {
      const note = this.noteRepository.create(createNoteDto);
      const saved = await this.noteRepository.save(note);
      return {
        statusCode: 201,
        message: 'Note added successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(
    reservationId: number,
    merchantId: number,
    page = 1,
    limit = 10,
  ): Promise<AllPaginatedReservationNotes> {
    return this.findAllGlobal(merchantId, {
      reservation_id: reservationId,
      page,
      limit,
    });
  }

  async findAllGlobal(
    merchantId: number,
    queryDto: GetReservationNotesQueryDto,
  ): Promise<AllPaginatedReservationNotes> {
    const { page = 1, limit = 10, reservation_id, created_by } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      reservation: { merchant_id: merchantId },
    };

    if (reservation_id) where.reservation_id = reservation_id;
    if (created_by) where.created_by = created_by;

    const [notes, total] = await this.noteRepository.findAndCount({
      where,
      relations: ['reservation'],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'All merchant notes retrieved successfully',
      data: notes.map((note) => this.mapToResponseDto(note)),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(
    id: number,
    merchantId: number,
    action?: string,
  ): Promise<OneReservationNoteResponse> {
    const note = await this.noteRepository.findOne({
      where: { id, is_active: true },
      relations: ['reservation'],
    });

    if (!note || note.reservation.merchant_id !== merchantId) {
      ErrorHandler.notFound('Note not found');
    }

    return {
      statusCode: 200,
      message: `Note ${action || 'retrieved'} successfully`,
      data: this.mapToResponseDto(note),
    };
  }

  async update(
    id: number,
    updateNoteDto: UpdateReservationNoteDto,
    merchantId: number,
  ): Promise<OneReservationNoteResponse> {
    await this.findOne(id, merchantId);
    const note = await this.noteRepository.findOneBy({ id });

    if (!note) {
      ErrorHandler.notFound('Note not found');
    }

    Object.assign(note, updateNoteDto);
    try {
      const saved = await this.noteRepository.save(note);
      return {
        statusCode: 200,
        message: 'Note updated successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    id: number,
    merchantId: number,
  ): Promise<OneReservationNoteResponse> {
    const noteRes = await this.findOne(id, merchantId);
    const note = await this.noteRepository.findOneBy({ id });

    if (!note) {
      ErrorHandler.notFound('Note not found');
    }

    note.is_active = false;
    await this.noteRepository.save(note);
    return {
      statusCode: 200,
      message: 'Note removed successfully',
      data: noteRes.data,
    };
  }

  private mapToResponseDto(note: ReservationNote): ReservationNoteResponseDto {
    return {
      id: note.id,
      reservation_id: note.reservation_id,
      note: note.note,
      created_by: note.created_by,
      created_at: note.created_at,
      is_active: note.is_active,
    };
  }

  private async validateReservationOwnership(
    reservationId: number,
    merchantId: number,
  ) {
    const reservation = await this.reservationRepository.findOneBy({
      id: reservationId,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound(
        'Reservation not found or does not belong to your merchant',
      );
    }
  }
}
