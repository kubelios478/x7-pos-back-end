import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CreateReservationTableDto } from './dto/create-reservation-table.dto';
import { UpdateReservationTableDto } from './dto/update-reservation-table.dto';
import { ReservationTable } from './entities/reservation-table.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { AllPaginatedReservationTables } from './dto/all-paginated-reservation-tables.dto';

import {
  OneReservationTableResponse,
  ReservationTableResponseDto,
} from './dto/reservation-table-response.dto';
import { GetReservationTablesQueryDto } from './dto/get-reservation-tables-query.dto';
import { BulkAssignReservationTablesDto } from './dto/bulk-assign-reservation-tables.dto';
import { TABLE_RELEASING_STATUSES } from '../reservation/constants/reservation.constants';

@Injectable()
export class ReservationTableService {
  constructor(
    @InjectRepository(ReservationTable)
    private readonly reservationTableRepository: Repository<ReservationTable>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateReservationTableDto,
    merchantId: number,
  ): Promise<OneReservationTableResponse> {
    const reservation = await this.validateReservationOwnership(
      createDto.reservation_id,
      merchantId,
    );

    const table = await this.tableRepository.findOneBy({
      id: createDto.table_id,
      merchant_id: merchantId,
    });
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

    // Doble reserva de la misma mesa: se comprueba ANTES de guardar. Sin esto, dos anfitrionas
    // en dos tablets sientan al mismo grupo de las 21:00 en la mesa 12 y nadie se entera hasta
    // que las dos familias están de pie en la puerta.
    await this.assertNoOverlap([createDto.table_id], reservation, merchantId);

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

  async findAll(
    reservationId: number,
    merchantId: number,
    page = 1,
    limit = 10,
  ): Promise<AllPaginatedReservationTables> {
    return this.findAllGlobal(merchantId, {
      reservation_id: reservationId,
      page,
      limit,
    });
  }

  async findAllGlobal(
    merchantId: number,
    queryDto: GetReservationTablesQueryDto,
  ): Promise<AllPaginatedReservationTables> {
    const { page = 1, limit = 10, reservation_id, table_id } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      reservation: { merchant_id: merchantId },
    };

    if (reservation_id) where.reservation_id = reservation_id;
    if (table_id) where.table_id = table_id;

    const [data, total] = await this.reservationTableRepository.findAndCount({
      where,
      relations: ['reservation', 'table', 'table.floorZone'],
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'All merchant reservation tables retrieved successfully',
      data: data.map((item) => this.mapToResponseDto(item)),
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
  ): Promise<OneReservationTableResponse> {
    const resTable = await this.reservationTableRepository.findOne({
      where: { id, is_active: true },
      relations: ['reservation', 'table', 'table.floorZone'],
    });

    if (!resTable || resTable.reservation.merchant_id !== merchantId) {
      ErrorHandler.notFound('Table assignment not found');
    }

    return {
      statusCode: 200,
      message: 'Table assignment retrieved successfully',
      data: this.mapToResponseDto(resTable),
    };
  }

  async update(
    id: number,
    updateDto: UpdateReservationTableDto,
    merchantId: number,
  ): Promise<OneReservationTableResponse> {
    await this.findOne(id, merchantId);
    const resTable = await this.reservationTableRepository.findOneBy({ id });

    if (!resTable) {
      ErrorHandler.notFound('Table assignment not found');
    }

    Object.assign(resTable, updateDto);
    try {
      const saved = await this.reservationTableRepository.save(resTable);
      return {
        statusCode: 200,
        message: 'Table assignment updated successfully',
        data: this.mapToResponseDto(saved),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async remove(
    reservationId: number,
    tableId: number,
    merchantId: number,
  ): Promise<OneReservationTableResponse> {
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

  async removeById(
    id: number,
    merchantId: number,
  ): Promise<OneReservationTableResponse> {
    const resTable = await this.reservationTableRepository.findOne({
      where: { id, is_active: true },
      relations: ['reservation'],
    });

    if (!resTable || resTable.reservation.merchant_id !== merchantId) {
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

  /**
   * Vincula varias mesas a una reserva de forma atómica.
   *
   * Todo ocurre dentro de una transacción: la validación de propiedad, la guarda de solape y
   * los insert. Si la tercera mesa de una combinación está pillada, se revierten las dos
   * primeras — media combinación asignada es peor que ninguna, porque la sala da el grupo por
   * sentado y sólo cabe la mitad.
   */
  async createBulk(
    dto: BulkAssignReservationTablesDto,
    merchantId: number,
  ): Promise<AllPaginatedReservationTables> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOneBy(Reservation, {
        id: dto.reservation_id,
        merchant_id: merchantId,
        is_active: true,
      });
      if (!reservation) {
        ErrorHandler.notFound('Reservation not found');
      }

      const tables = await manager.findBy(Table, {
        id: In(dto.table_ids),
        merchant_id: merchantId,
      });
      if (tables.length !== dto.table_ids.length) {
        ErrorHandler.notFound(
          'One or more tables not found or do not belong to your merchant',
        );
      }

      await this.assertNoOverlap(dto.table_ids, reservation, merchantId, manager);

      // Reasignar una mesa que ya estuvo en esta reserva y se soltó reactiva la fila en vez de
      // insertar una segunda: el par (reserva, mesa) es uno solo por mucho que se toquetee.
      const existing = await manager.findBy(ReservationTable, {
        reservation_id: dto.reservation_id,
        table_id: In(dto.table_ids),
      });
      const existingByTable = new Map(existing.map((e) => [e.table_id, e]));

      const rows = dto.table_ids.map((tableId) => {
        const prior = existingByTable.get(tableId);
        if (prior) {
          prior.is_active = true;
          return prior;
        }
        return manager.create(ReservationTable, {
          reservation_id: dto.reservation_id,
          table_id: tableId,
          is_active: true,
        });
      });

      const saved = await manager.save(ReservationTable, rows);

      // Se releen con la relación para devolver número, aforo y zona ya hidratados: la fila
      // recién guardada sólo trae los escalares.
      const hydrated = await manager.find(ReservationTable, {
        where: { id: In(saved.map((r) => r.id)) },
        relations: ['table', 'table.floorZone'],
      });

      return {
        statusCode: 201,
        message: `${hydrated.length} table(s) assigned successfully`,
        data: hydrated.map((item) => this.mapToResponseDto(item)),
        page: 1,
        limit: hydrated.length,
        total: hydrated.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
    });
  }

  /**
   * Guarda de doble reserva sobre la ventana [inicio, inicio + duración).
   *
   * Una reserva anulada, ausente o ya terminada NO retiene la mesa (TABLE_RELEASING_STATUSES).
   * El solape es de intervalos semiabiertos: una reserva que acaba a las 21:00 y otra que
   * empieza a las 21:00 no compiten por la mesa.
   */
  private async assertNoOverlap(
    tableIds: number[],
    target: Reservation,
    merchantId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(ReservationTable)
      : this.reservationTableRepository;
    const reservationId = target.id;

    const conflict = await repo
      .createQueryBuilder('resTable')
      .innerJoin('resTable.reservation', 'reservation')
      .leftJoin('resTable.table', 'table')
      .select([
        'resTable.table_id AS table_id',
        'reservation.id AS reservation_id',
        'reservation.reservation_date AS reservation_date',
        'table.number AS table_number',
      ])
      .where('resTable.table_id IN (:...tableIds)', { tableIds })
      .andWhere('resTable.is_active = true')
      .andWhere('reservation.merchant_id = :merchantId', { merchantId })
      .andWhere('reservation.is_active = true')
      .andWhere('reservation.id != :reservationId', { reservationId })
      .andWhere('reservation.status NOT IN (:...released)', {
        released: TABLE_RELEASING_STATUSES,
      })
      .andWhere(
        `(reservation.reservation_date < :end AND (reservation.reservation_date + (reservation.duration_minutes || ' minutes')::interval) > :start)`,
        {
          start: target.reservation_date,
          end: new Date(
            new Date(target.reservation_date).getTime() +
              (target.duration_minutes || 0) * 60000,
          ),
        },
      )
      .getRawOne();

    if (conflict) {
      // 409 y no 400: el cuerpo de la petición es válido, lo que falla es el estado del salón
      // en ese momento — y el cliente puede resolverlo eligiendo otra mesa u otra hora.
      throw new ConflictException(
        `Table ${conflict.table_number ?? conflict.table_id} is already booked by reservation #${conflict.reservation_id} during this time window.`,
      );
    }
  }

  private mapToResponseDto(
    resTable: ReservationTable,
  ): ReservationTableResponseDto {
    return {
      id: resTable.id,
      reservation_id: resTable.reservation_id,
      table_id: resTable.table_id,
      is_active: resTable.is_active,
      table_number: resTable.table?.number,
      capacity: resTable.table?.capacity,
      // La zona es lo que permite filtrar el tablero por sección de sala (Main Dining,
      // Terraza, Bar). Sin ella el filtro de zona no tenía de dónde salir.
      zone_id: resTable.table?.floorZone?.id ?? null,
      zone_name: resTable.table?.floorZone?.name ?? null,
      zone_color: resTable.table?.floorZone?.color ?? null,
    };
  }

  private async validateReservationOwnership(
    reservationId: number,
    merchantId: number,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOneBy({
      id: reservationId,
      merchant_id: merchantId,
      is_active: true,
    });

    if (!reservation) {
      ErrorHandler.notFound('Reservation not found');
    }

    return reservation;
  }
}
