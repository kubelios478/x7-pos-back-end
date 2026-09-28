import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationService } from './reservation.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationTable } from 'src/restaurant-operations/reservations/reservation-table/entities/reservation-table.entity';
import { ReservationStatusHistory } from 'src/restaurant-operations/reservations/reservation-status-history/entities/reservation-status-history.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { ReservationNote } from 'src/restaurant-operations/reservations/reservation-note/entities/reservation-note.entity';
import { ReservationGuest } from 'src/restaurant-operations/reservations/reservation-guest/entities/reservation-guest.entity';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { ReservationStatus } from './constants/reservation.constants';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ConflictException } from '@nestjs/common';
import { ReservationCapacityService } from '../reservation-capacity/reservation-capacity.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let reservationRepository: Repository<Reservation>;
  let resTableRepository: Repository<ReservationTable>;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };

  const mockReservationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockResTableRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    findBy: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockGenericRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    findOneBy: jest.fn(),
    findBy: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  // La transacción corre el callback con un manager cuyos repositorios son los mismos mocks:
  // así las aserciones sobre save/create siguen valiendo dentro y fuera de la transacción.
  const repositoriesByEntity = new Map<unknown, unknown>([
    [Reservation, mockReservationRepository],
    [ReservationTable, mockResTableRepository],
    [ReservationStatusHistory, mockGenericRepository],
    [Table, mockGenericRepository],
  ]);
  const mockManager = {
    getRepository: jest.fn((entity) => repositoriesByEntity.get(entity)),
  };
  const mockDataSource = {
    transaction: jest.fn((work) => work(mockManager)),
  };

  // La guarda de aforo tiene su propio spec; aquí sólo importa CUÁNDO se invoca y qué se
  // hace con su veredicto.
  const mockCapacityService = {
    assertBookable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: ReservationCapacityService, useValue: mockCapacityService },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(ReservationTable),
          useValue: mockResTableRepository,
        },
        {
          provide: getRepositoryToken(ReservationStatusHistory),
          useValue: mockGenericRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockGenericRepository,
        },
        {
          provide: getRepositoryToken(ReservationNote),
          useValue: mockGenericRepository,
        },
        {
          provide: getRepositoryToken(ReservationGuest),
          useValue: mockGenericRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
    reservationRepository = module.get<Repository<Reservation>>(
      getRepositoryToken(Reservation),
    );
    resTableRepository = module.get<Repository<ReservationTable>>(
      getRepositoryToken(ReservationTable),
    );

    jest.clearAllMocks();
    mockCapacityService.assertBookable.mockResolvedValue({ overrideBy: null });
  });

  describe('create', () => {
    const createDto = {
      reservation_date: '2026-04-16T19:00:00Z',
      party_size: 4,
      table_ids: [1, 2],
      duration_minutes: 120,
    };
    const merchantId = 1;

    it('should create a reservation when tables are available', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null); // No conflict
      mockGenericRepository.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]); // Tables found
      const reservation = {
        id: 10,
        ...createDto,
        reservation_date: new Date(createDto.reservation_date),
        status: ReservationStatus.PENDING,
      };
      mockReservationRepository.create.mockReturnValue(reservation);
      mockReservationRepository.save.mockResolvedValue(reservation);

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: reservation } as any);

      const result = await service.create(merchantId, createDto);

      expect(result.data).toBeDefined();
      expect(mockResTableRepository.save).toHaveBeenCalledTimes(1);
      expect(mockGenericRepository.save).toHaveBeenCalled(); // History log
    });

    it('should stamp created_by with the authenticated staff id', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockGenericRepository.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const reservation = { id: 10, status: ReservationStatus.PENDING };
      mockReservationRepository.create.mockReturnValue(reservation);
      mockReservationRepository.save.mockResolvedValue(reservation);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: reservation } as any);

      await service.create(merchantId, createDto, 7);

      // Auditoría del alta: el id sale del token, no del cuerpo.
      expect(mockReservationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ created_by: 7 }),
      );
      expect(mockGenericRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ changed_by: 7 }),
      );
    });

    it('should fail when tables are already booked', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({ id: 99 }); // Conflicting reservation

      await expect(service.create(merchantId, createDto)).rejects.toThrow();
    });

    it('should fail if some requested tables do not exist for the merchant', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null); // No booking conflict
      mockGenericRepository.findBy.mockResolvedValue([{ id: 1 }]); // Only 1 table found instead of 2

      await expect(service.create(merchantId, createDto)).rejects.toThrow(
        'One or more tables not found or do not belong to your merchant',
      );
    });

    it('should create a reservation without tables', async () => {
      const dtoWithoutTables = { ...createDto, table_ids: [] };
      const reservation = {
        id: 11,
        ...dtoWithoutTables,
        reservation_date: new Date(),
      };
      mockReservationRepository.create.mockReturnValue(reservation);
      mockReservationRepository.save.mockResolvedValue(reservation);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: reservation } as any);

      const result = await service.create(merchantId, dtoWithoutTables);

      expect(result.data.id).toBe(11);
      expect(mockResTableRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('capacity guard', () => {
    const merchantId = 3;
    const dto = { reservation_date: '2026-04-16T19:00:00Z', party_size: 6 };

    beforeEach(() => {
      mockReservationRepository.create.mockImplementation((r) => ({ id: 50, ...r }));
      mockReservationRepository.save.mockImplementation((r) => Promise.resolve(r));
      jest.spyOn(service, 'findOne').mockResolvedValue({ data: {} } as any);
    });

    it('checks capacity inside the create transaction with the booking window', async () => {
      await service.create(merchantId, dto, 7);

      expect(mockCapacityService.assertBookable).toHaveBeenCalledWith(
        mockManager,
        merchantId,
        {
          start: new Date('2026-04-16T19:00:00Z'),
          durationMinutes: 90,
          partySize: 6,
          excludeReservationId: undefined,
        },
        undefined,
      );
    });

    it('does not guard a walk-in created already seated, nor the wait list', async () => {
      await service.create(merchantId, { ...dto, status: ReservationStatus.SEATED });
      await service.create(merchantId, { ...dto, status: ReservationStatus.WAIT_LIST });
      expect(mockCapacityService.assertBookable).not.toHaveBeenCalled();
    });

    it('propagates the 409 unchanged (not as a 500) and saves nothing', async () => {
      mockCapacityService.assertBookable.mockRejectedValue(
        new ConflictException({ code: 'CAPACITY_OVERRIDE_REQUIRED', message: 'Over capacity' }),
      );

      await expect(service.create(merchantId, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it('records who authorized an override, without storing the credentials', async () => {
      mockCapacityService.assertBookable.mockResolvedValue({ overrideBy: 2 });
      const override = { email: 'boss@x.com', password: 'secret' };

      await service.create(merchantId, { ...dto, manager_override: override });

      expect(mockCapacityService.assertBookable).toHaveBeenCalledWith(
        mockManager,
        merchantId,
        expect.any(Object),
        override,
      );
      const saved = mockReservationRepository.save.mock.calls[0][0];
      expect(saved.capacity_override_by).toBe(2);
      expect(saved.capacity_override_at).toBeInstanceOf(Date);
      expect(saved).not.toHaveProperty('manager_override');
    });

    it('re-checks when a pending booking is confirmed, excluding itself', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 9,
        merchant_id: merchantId,
        status: ReservationStatus.PENDING,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
        duration_minutes: 120,
        party_size: 4,
      });

      await service.update(9, merchantId, { status: ReservationStatus.CONFIRMED }, 7);

      expect(mockCapacityService.assertBookable).toHaveBeenCalledWith(
        mockManager,
        merchantId,
        expect.objectContaining({ durationMinutes: 120, partySize: 4, excludeReservationId: 9 }),
        undefined,
      );
    });

    it('re-checks when a confirmed booking grows, but not on a no-op resend', async () => {
      const existing = () => ({
        id: 9,
        merchant_id: merchantId,
        status: ReservationStatus.CONFIRMED,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
        duration_minutes: 90,
        party_size: 4,
      });
      mockReservationRepository.findOneBy.mockResolvedValue(existing());
      await service.update(9, merchantId, { party_size: 4, special_requests: 'x' });
      expect(mockCapacityService.assertBookable).not.toHaveBeenCalled();

      mockReservationRepository.findOneBy.mockResolvedValue(existing());
      await service.update(9, merchantId, { party_size: 8 });
      expect(mockCapacityService.assertBookable).toHaveBeenCalledWith(
        mockManager,
        merchantId,
        expect.objectContaining({ partySize: 8, excludeReservationId: 9 }),
        undefined,
      );
    });

    it('does not guard seating or completing a party', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 9,
        merchant_id: merchantId,
        status: ReservationStatus.CONFIRMED,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
        duration_minutes: 90,
        party_size: 4,
      });
      await service.update(9, merchantId, { status: ReservationStatus.SEATED });
      expect(mockCapacityService.assertBookable).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should filter by date and status', async () => {
      const query = { date: '2026-04-16', status: ReservationStatus.CONFIRMED };
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.findAll(query, 1);

      // El día se compara como rango semiabierto contra la columna DESNUDA. Envolverla en
      // DATE() la volvía no sargable y tiraba el índice [merchant_id, reservation_date].
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.reservation_date >= :rangeStart'),
        {
          rangeStart: new Date(2026, 3, 16, 0, 0, 0, 0),
          rangeEnd: new Date(2026, 3, 17, 0, 0, 0, 0),
        },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('DATE(reservation.reservation_date)'),
        expect.anything(),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.status = :status'),
        { status: query.status },
      );
    });

    it('should filter by an explicit date range for week/month views', async () => {
      const query = {
        date_from: '2026-04-13T00:00:00.000Z',
        date_to: '2026-04-20T00:00:00.000Z',
      };
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.reservation_date < :rangeEnd'),
        {
          rangeStart: new Date('2026-04-13T00:00:00.000Z'),
          rangeEnd: new Date('2026-04-20T00:00:00.000Z'),
        },
      );
    });

    it('should filter by customer_id', async () => {
      const query = { customer_id: 50 };
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.customer_id = :customer_id'),
        { customer_id: 50 },
      );
    });

    it('should filter by guest name (partial search)', async () => {
      const query = { guest_name: 'John' };
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(guests.name) LIKE LOWER(:guestName)'),
        { guestName: '%John%' },
      );
    });

    it('should handle pagination correctly', async () => {
      const query = { page: 2, limit: 5 };
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('should return enriched reservation with relations', async () => {
      const reservation = {
        id: 1,
        merchant_id: 1,
        guests: [],
        tables: [],
        notes: [],
        statusHistory: [],
      };
      mockReservationRepository.findOne.mockResolvedValue(reservation);

      const result = await service.findOne(1, 1);

      expect(result.data).toBeDefined();
      expect(mockReservationRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          relations: expect.arrayContaining([
            'guests',
            'tables',
            'notes',
            'statusHistory',
          ]),
        }),
      );
    });

    it('should throw not found if reservation belongs to another merchant', async () => {
      mockReservationRepository.findOne.mockImplementation(({ where }) => {
        if (where.merchant_id === 1)
          return Promise.resolve({ id: 1, merchant_id: 1 });
        return Promise.resolve(null);
      });

      await expect(service.findOne(1, 2)).rejects.toThrow();
    });

    it('should throw not found if reservation does not exist', async () => {
      mockReservationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, 1)).rejects.toThrow(
        'Reservation not found',
      );
    });
  });

  describe('update', () => {
    it('should check availability if date changes', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      mockResTableRepository.findBy.mockResolvedValue([{ table_id: 1 }]); // Return tables to trigger check
      mockQueryBuilder.getOne.mockResolvedValue(null);

      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.update(1, 1, { reservation_date: '2026-04-16T20:00:00Z' });

      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should update and log status change if status updated', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.PENDING,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);

      jest.spyOn(service, 'findOne').mockResolvedValue({
        data: { ...existing, status: ReservationStatus.CONFIRMED },
      } as any);

      await service.update(1, 1, { status: ReservationStatus.CONFIRMED });

      expect(mockGenericRepository.save).toHaveBeenCalled(); // History log for status change
    });

    it('should stamp seated_at when the party is seated', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.CONFIRMED,
        seated_at: null,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.update(1, 1, { status: ReservationStatus.SEATED });

      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReservationStatus.SEATED,
          seated_at: expect.any(Date),
        }),
      );
    });

    it('should not overwrite an existing seated_at', async () => {
      const firstArrival = new Date('2026-04-16T19:05:00Z');
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.CONFIRMED,
        seated_at: firstArrival,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.update(1, 1, { status: ReservationStatus.SEATED });

      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ seated_at: firstArrival }),
      );
    });

    it('should reject an illegal lifecycle jump (cancelled -> completed)', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.CANCELLED,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);

      await expect(
        service.update(1, 1, { status: ReservationStatus.COMPLETED }),
      ).rejects.toThrow(/cannot become 'completed'/);

      expect(mockReservationRepository.save).not.toHaveBeenCalled();
    });

    it('should record who changed the status', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.PENDING,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.update(1, 1, { status: ReservationStatus.CONFIRMED }, 42);

      expect(mockGenericRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ changed_by: 42 }),
      );
    });

    it('should write the status and its history entry in one transaction', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.PENDING,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      mockGenericRepository.save.mockRejectedValueOnce(
        new Error('history insert failed'),
      );

      // Si el INSERT del histórico falla, la transacción entera falla: el cambio de estado
      // no puede quedar aplicado sin su rastro de auditoría.
      await expect(
        service.update(1, 1, { status: ReservationStatus.CONFIRMED }, 42),
      ).rejects.toThrow();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockReservationRepository.save).toHaveBeenCalled();
    });

    it('should not log history when the status is unchanged', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.PENDING,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.update(1, 1, { party_size: 3 });

      expect(mockGenericRepository.save).not.toHaveBeenCalled();
    });

    it('should update party_size without checking availability', async () => {
      const existing = { id: 1, merchant_id: 1, reservation_date: new Date() };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.update(1, 1, { party_size: 10 });

      expect(mockQueryBuilder.getOne).not.toHaveBeenCalled();
      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ party_size: 10 }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel and sign the history entry with the staff member', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.CONFIRMED,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);
      jest
        .spyOn(service, 'findOne')
        .mockResolvedValue({ data: existing } as any);

      await service.cancel(1, 1, 42);

      expect(mockReservationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ReservationStatus.CANCELLED }),
      );
      // Antes se guardaba sin firma y la anulación se leía como "Automated System".
      expect(mockGenericRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reservation_id: 1,
          status: ReservationStatus.CANCELLED,
          changed_by: 42,
        }),
      );
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should reject cancelling a reservation in a terminal state', async () => {
      const existing = {
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.COMPLETED,
      };
      mockReservationRepository.findOneBy.mockResolvedValue(existing);

      await expect(service.cancel(1, 1, 42)).rejects.toThrow(
        /'completed' is a terminal state/,
      );
      expect(mockReservationRepository.save).not.toHaveBeenCalled();
      expect(mockGenericRepository.save).not.toHaveBeenCalled();
    });

    it('should reject cancelling twice', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        status: ReservationStatus.CANCELLED,
      });

      await expect(service.cancel(1, 1, 42)).rejects.toThrow();
      expect(mockGenericRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete reservation and deactivate tables, guests and notes', async () => {
      const reservation = { id: 1, merchant_id: 1, is_active: true };

      mockReservationRepository.findOneBy.mockResolvedValue(reservation);

      await service.remove(1, 1);

      expect(reservation.is_active).toBe(false);
      expect(mockReservationRepository.save).toHaveBeenCalledWith(reservation);
      expect(mockResTableRepository.update).toHaveBeenCalledWith(
        { reservation_id: 1 },
        { is_active: false },
      );
      expect(mockGenericRepository.update).toHaveBeenCalledTimes(2);
      expect(mockGenericRepository.update).toHaveBeenCalledWith(
        { reservation_id: 1 },
        { is_active: false },
      );
    });

    it('should fail to remove if reservation not found', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow();
    });
  });
});
