import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableService } from './reservation-table.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationTable } from './entities/reservation-table.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';

describe('ReservationTableService', () => {
  let service: ReservationTableService;

  const mockResTableRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockReservationRepository = {
    findOneBy: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ReservationTableService>(ReservationTableService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
