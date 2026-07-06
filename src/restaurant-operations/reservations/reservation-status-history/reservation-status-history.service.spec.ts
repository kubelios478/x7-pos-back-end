import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';

describe('ReservationStatusHistoryService', () => {
  let service: ReservationStatusHistoryService;

  const mockHistoryRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationStatusHistoryService,
        {
          provide: getRepositoryToken(ReservationStatusHistory),
          useValue: mockHistoryRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationStatusHistoryService>(
      ReservationStatusHistoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllGlobal', () => {
    it('should return paginated and mapped results', async () => {
      const data = [
        {
          id: 1,
          reservation_id: 1,
          status: 'confirmed',
          changed_at: new Date(),
        },
      ];
      mockHistoryRepository.findAndCount.mockResolvedValue([data, 1]);

      const result = await service.findAllGlobal(1, { page: 1, limit: 10 });
      expect(result.statusCode).toBe(200);
      expect(result.data[0].status).toBe('confirmed');
    });

    it('should filter by reservation_id if provided', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(1, { reservation_id: 10 });
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reservation_id: 10 }),
        }),
      );
    });

    it('should filter by status if provided', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(1, { status: 'cancelled' as any });
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'cancelled' }),
        }),
      );
    });

    it('should order by changed_at DESC', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(1, {});
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { changed_at: 'DESC' },
        }),
      );
    });
  });

  describe('findAll (by reservation)', () => {
    it('should call findAllGlobal with reservation_id', async () => {
      const spy = jest
        .spyOn(service, 'findAllGlobal')
        .mockResolvedValue({} as any);
      await service.findAll(1, 1, 1, 10);
      expect(spy).toHaveBeenCalledWith(1, {
        reservation_id: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return entry if merchant matches', async () => {
      const entry = { id: 1, reservation: { merchant_id: 1 } };
      mockHistoryRepository.findOne.mockResolvedValue(entry);

      const result = await service.findOne(1, 1);
      expect(result.statusCode).toBe(200);
    });

    it('should throw error if merchant mismatch', async () => {
      const entry = { id: 1, reservation: { merchant_id: 2 } };
      mockHistoryRepository.findOne.mockResolvedValue(entry);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Status history entry not found',
      );
    });

    it('should throw error if entry not found', async () => {
      mockHistoryRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Status history entry not found',
      );
    });
  });
});
