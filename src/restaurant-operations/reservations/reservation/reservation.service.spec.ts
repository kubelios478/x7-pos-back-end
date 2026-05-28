import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationService } from './reservation.service';
import { Reservation } from './entities/reservation.entity';
import { ReservationTable } from 'src/restaurant-operations/reservations/reservation-table/entities/reservation-table.entity';
import { ReservationStatusHistory } from 'src/restaurant-operations/reservations/reservation-status-history/entities/reservation-status-history.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { ReservationNote } from 'src/restaurant-operations/reservations/reservation-note/entities/reservation-note.entity';
import { ReservationGuest } from 'src/restaurant-operations/reservations/reservation-guest/entities/reservation-guest.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ReservationStatus } from './constants/reservation.constants';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
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

  describe('findAll', () => {
    it('should filter by date and status', async () => {
      const query = { date: '2026-04-16', status: ReservationStatus.CONFIRMED };
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      await service.findAll(query, 1);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('DATE(reservation.reservation_date) = :date'),
        { date: query.date },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.status = :status'),
        { status: query.status },
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
