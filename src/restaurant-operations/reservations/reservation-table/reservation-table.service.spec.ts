import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableService } from './reservation-table.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationTable } from './entities/reservation-table.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';

describe('ReservationTableService', () => {
  let service: ReservationTableService;

  // La guarda de solape consulta con QueryBuilder; por defecto NO encuentra conflicto, así
  // que los tests que no hablan de doble reserva siguen viendo el camino feliz.
  const mockOverlapQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
  };

  const mockResTableRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockOverlapQueryBuilder),
  };

  // `manager` cuelga del repositorio de reservas en assertNoOverlap cuando no hay transacción.
  const mockEntityManager = {
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((_entity, dto) => dto),
    save: jest.fn().mockImplementation((_entity, rows) => Promise.resolve(rows)),
    getRepository: jest.fn(() => mockResTableRepository),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (m: typeof mockEntityManager) => unknown) =>
      cb(mockEntityManager),
    ),
  };

  const mockReservationRepository = {
    findOneBy: jest.fn(),
    manager: mockEntityManager,
  };

  const mockTableRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationTableService,
        {
          provide: getRepositoryToken(ReservationTable),
          useValue: mockResTableRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockTableRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ReservationTableService>(ReservationTableService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockOverlapQueryBuilder.getRawOne.mockResolvedValue(null);
    mockOverlapQueryBuilder.innerJoin.mockReturnThis();
    mockOverlapQueryBuilder.leftJoin.mockReturnThis();
    mockOverlapQueryBuilder.select.mockReturnThis();
    mockOverlapQueryBuilder.where.mockReturnThis();
    mockOverlapQueryBuilder.andWhere.mockReturnThis();
    mockResTableRepository.createQueryBuilder.mockReturnValue(
      mockOverlapQueryBuilder,
    );
    mockEntityManager.getRepository.mockReturnValue(mockResTableRepository);
    mockEntityManager.create.mockImplementation((_entity, dto) => dto);
    mockEntityManager.save.mockImplementation((_entity, rows) =>
      Promise.resolve(rows),
    );
    mockDataSource.transaction.mockImplementation((cb: any) =>
      cb(mockEntityManager),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { reservation_id: 1, table_id: 1 };
    const merchantId = 1;

    it('should create an assignment successfully', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      mockTableRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
      });
      mockResTableRepository.findOneBy.mockResolvedValue(null);

      const result = await service.create(dto, merchantId);
      expect(result.statusCode).toBe(201);
      expect(mockResTableRepository.save).toHaveBeenCalled();
    });

    it('should return 200 if already assigned and active', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      mockTableRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
      });
      mockResTableRepository.findOneBy.mockResolvedValue({
        ...dto,
        is_active: true,
      });

      const result = await service.create(dto, merchantId);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Table already assigned');
      expect(mockResTableRepository.save).not.toHaveBeenCalled();
    });

    it('should fail if reservation belongs to another merchant', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(dto, merchantId)).rejects.toThrow(
        'Reservation not found',
      );
    });

    it('should fail if reservation is inactive', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null); // because findOneBy filters by is_active: true
      await expect(service.create(dto, merchantId)).rejects.toThrow(
        'Reservation not found',
      );
    });

    it("should fail if table belongs to another merchant or doesn't exist", async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      mockTableRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(dto, merchantId)).rejects.toThrow(
        'Table not found',
      );
    });
  });

  describe('overlap guardrail', () => {
    const dto = { reservation_id: 1, table_id: 12 };

    beforeEach(() => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
        duration_minutes: 90,
      });
      mockTableRepository.findOneBy.mockResolvedValue({ id: 12, merchant_id: 1 });
      mockResTableRepository.findOneBy.mockResolvedValue(null);
    });

    it('rejects with 409 when the table is taken in the same window', async () => {
      mockOverlapQueryBuilder.getRawOne.mockResolvedValue({
        table_id: 12,
        reservation_id: 7,
        table_number: 'A12',
      });

      await expect(service.create(dto, 1)).rejects.toThrow(ConflictException);
      // Nada se persiste cuando hay conflicto.
      expect(mockResTableRepository.save).not.toHaveBeenCalled();
    });

    it('names the table and the conflicting reservation in the error', async () => {
      mockOverlapQueryBuilder.getRawOne.mockResolvedValue({
        table_id: 12,
        reservation_id: 7,
        table_number: 'A12',
      });

      await expect(service.create(dto, 1)).rejects.toThrow(
        /Table A12 is already booked by reservation #7/,
      );
    });

    it('excludes cancelled / no-show / completed reservations from the conflict', async () => {
      await service.create(dto, 1);

      // Una reserva anulada o ya terminada no retiene la mesa.
      expect(mockOverlapQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.status NOT IN'),
        { released: ['cancelled', 'no_show', 'completed'] },
      );
    });

    it('does not let a reservation conflict with itself', async () => {
      await service.create(dto, 1);

      expect(mockOverlapQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('reservation.id != :reservationId'),
        { reservationId: 1 },
      );
    });

    it('compares half-open windows so back-to-back bookings do not clash', async () => {
      await service.create(dto, 1);

      const windowCall = mockOverlapQueryBuilder.andWhere.mock.calls.find(
        ([sql]: [string]) => String(sql).includes('reservation_date <'),
      );
      expect(windowCall).toBeDefined();
      // 19:00 + 90 min => 20:30 exactos como cierre exclusivo.
      expect(windowCall[1].start).toEqual(new Date('2026-04-16T19:00:00Z'));
      expect(windowCall[1].end).toEqual(new Date('2026-04-16T20:30:00Z'));
    });
  });

  describe('createBulk', () => {
    const bulkDto = { reservation_id: 1, table_ids: [12, 13] };

    beforeEach(() => {
      mockEntityManager.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
        duration_minutes: 90,
      });
      mockEntityManager.findBy.mockImplementation((entity: unknown) =>
        entity === Table
          ? Promise.resolve([{ id: 12 }, { id: 13 }])
          : Promise.resolve([]),
      );
      mockEntityManager.save.mockResolvedValue([
        { id: 1, reservation_id: 1, table_id: 12 },
        { id: 2, reservation_id: 1, table_id: 13 },
      ]);
      mockEntityManager.find.mockResolvedValue([
        {
          id: 1,
          reservation_id: 1,
          table_id: 12,
          is_active: true,
          table: { number: 'A12', capacity: 4, floorZone: { id: 3, name: 'Terrace' } },
        },
        {
          id: 2,
          reservation_id: 1,
          table_id: 13,
          is_active: true,
          table: { number: 'A13', capacity: 4, floorZone: { id: 3, name: 'Terrace' } },
        },
      ]);
    });

    it('links several tables in ONE transaction', async () => {
      const result = await service.createBulk(bulkDto, 1);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result.statusCode).toBe(201);
      expect(result.data).toHaveLength(2);
    });

    it('exposes the zone of each combined table', async () => {
      const result = await service.createBulk(bulkDto, 1);

      expect(result.data[0]).toMatchObject({
        table_number: 'A12',
        capacity: 4,
        zone_id: 3,
        zone_name: 'Terrace',
      });
    });

    it('rolls the whole combination back when ONE table clashes', async () => {
      mockOverlapQueryBuilder.getRawOne.mockResolvedValue({
        table_id: 13,
        reservation_id: 7,
        table_number: 'A13',
      });

      await expect(service.createBulk(bulkDto, 1)).rejects.toThrow(
        ConflictException,
      );
      // Media combinación asignada es peor que ninguna: no se guarda nada.
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('reactivates a previously released pair instead of duplicating it', async () => {
      mockEntityManager.findBy.mockImplementation((entity: unknown) =>
        entity === Table
          ? Promise.resolve([{ id: 12 }, { id: 13 }])
          : Promise.resolve([
              { id: 99, reservation_id: 1, table_id: 12, is_active: false },
            ]),
      );

      await service.createBulk(bulkDto, 1);

      const savedRows = mockEntityManager.save.mock.calls[0][1];
      expect(savedRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 99, table_id: 12, is_active: true }),
        ]),
      );
    });

    it('refuses tables that belong to another merchant', async () => {
      mockEntityManager.findBy.mockImplementation((entity: unknown) =>
        entity === Table ? Promise.resolve([{ id: 12 }]) : Promise.resolve([]),
      );

      await expect(service.createBulk(bulkDto, 1)).rejects.toThrow(
        /One or more tables not found/,
      );
    });
  });

  describe('findAllGlobal', () => {
    const merchantId = 1;

    it('should return mapped results with table details', async () => {
      const data = [
        {
          reservation_id: 1,
          table_id: 1,
          table: { number: 'A1', capacity: 4 },
        },
      ];
      mockResTableRepository.findAndCount.mockResolvedValue([data, 1]);

      const result = await service.findAllGlobal(merchantId, {
        page: 1,
        limit: 10,
      });
      expect(result.statusCode).toBe(200);
      expect(result.data[0].table_number).toBe('A1');
      expect(result.data[0].capacity).toBe(4);
    });

    it('should filter by reservation_id if provided', async () => {
      mockResTableRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { reservation_id: 10 });

      expect(mockResTableRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservation_id: 10,
          }),
        }),
      );
    });

    it('should filter by table_id if provided', async () => {
      mockResTableRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { table_id: 5 });

      expect(mockResTableRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            table_id: 5,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return mapped record if merchant matches', async () => {
      const record = {
        id: 1,
        reservation_id: 1,
        reservation: { merchant_id: 1 },
        table: { number: 'A1', capacity: 4 },
      };
      mockResTableRepository.findOne.mockResolvedValue(record);

      const result = await service.findOne(1, 1);
      expect(result.data.table_number).toBe('A1');
    });

    it('should throw if merchant mismatch', async () => {
      const record = { reservation: { merchant_id: 2 } };
      mockResTableRepository.findOne.mockResolvedValue(record);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Table assignment not found',
      );
    });

    it('should throw if assignment not found', async () => {
      mockResTableRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Table assignment not found',
      );
    });
  });

  describe('update', () => {
    it('should update assignment successfully', async () => {
      const record = { id: 1, reservation: { merchant_id: 1 } };
      mockResTableRepository.findOne.mockResolvedValue(record);
      mockResTableRepository.findOneBy.mockResolvedValue(record);

      const result = await service.update(1, { is_active: false }, 1);
      expect(result.statusCode).toBe(200);
      expect(mockResTableRepository.save).toHaveBeenCalled();
    });

    it('should fail if assignment belongs to another merchant', async () => {
      mockResTableRepository.findOne.mockResolvedValue({
        reservation: { merchant_id: 2 },
      });
      await expect(service.update(1, { is_active: false }, 1)).rejects.toThrow(
        'Table assignment not found',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete assignment if merchant matches', async () => {
      const record = { reservation_id: 1, table_id: 1, is_active: true };
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      mockResTableRepository.findOneBy.mockResolvedValue(record);

      const result = await service.remove(1, 1, 1);
      expect(record.is_active).toBe(false);
      expect(result.statusCode).toBe(200);
      expect(mockResTableRepository.save).toHaveBeenCalled();
    });

    it('should fail if reservation belongs to another merchant', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1, 1, 1)).rejects.toThrow(
        'Reservation not found',
      );
    });

    it("should fail if assignment doesn't exist", async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      mockResTableRepository.findOneBy.mockResolvedValue(null);
      await expect(service.remove(1, 1, 1)).rejects.toThrow(
        'Table assignment not found',
      );
    });
  });
});
