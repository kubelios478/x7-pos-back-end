import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';
import { Reservation } from '../reservation/entities/reservation.entity';

describe('ReservationStatusHistoryService', () => {
  let service: ReservationStatusHistoryService;

  const mockHistoryRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
  };

  const mockReservationRepository = {
    exists: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationStatusHistoryService,
        {
          provide: getRepositoryToken(ReservationStatusHistory),
          useValue: mockHistoryRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationStatusHistoryService>(
      ReservationStatusHistoryService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockHistoryRepository.find.mockResolvedValue([]);
    mockReservationRepository.exists.mockResolvedValue(true);
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

    it('should order by changed_at DESC, ties broken by insertion order', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(1, {});
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { changed_at: 'DESC', id: 'DESC' },
        }),
      );
    });

    it('should hide the history of logically deleted reservations', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(7, {});
      expect(mockHistoryRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservation: { merchant_id: 7, is_active: true },
          }),
        }),
      );
    });
  });

  describe('findAllGlobal — previous entry and reservation context', () => {
    it('resolves previous_status from the full lifecycle, not from the page', async () => {
      const reservation = {
        id: 14,
        reservation_date: new Date('2026-04-16T19:00:00Z'),
        duration_minutes: 90,
        seated_at: null,
        party_size: 4,
        status: 'confirmed',
        customer: null,
        guests: [
          { name: 'Old', is_primary: true, is_active: false },
          { name: 'Carlos', is_primary: false, is_active: true },
        ],
      };
      // La página sólo trae la confirmación (filtro de día); el alta es de la víspera.
      const confirmed = {
        id: 30,
        reservation_id: 14,
        status: 'confirmed',
        changed_at: new Date('2026-04-16T14:20:00Z'),
        changed_by: null,
        is_active: true,
        reservation,
      };
      mockHistoryRepository.findAndCount.mockResolvedValue([[confirmed], 1]);
      mockHistoryRepository.find.mockResolvedValue([
        { id: 27, reservation_id: 14, status: 'pending', changed_at: new Date('2026-04-15T10:00:00Z') },
        { id: 30, reservation_id: 14, status: 'confirmed', changed_at: new Date('2026-04-16T14:20:00Z') },
      ]);

      const result = await service.findAllGlobal(1, { date: '2026-04-16' });

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          previous_status: 'pending',
          previous_changed_at: new Date('2026-04-15T10:00:00Z'),
          changed_by: null,
        }),
      );
      // Invitado inactivo descartado: el nombre sale del comensal activo.
      expect(result.data[0].reservation).toEqual(
        expect.objectContaining({ id: 14, guest_name: 'Carlos', duration_minutes: 90 }),
      );
    });

    it('filters by the local day the change was logged on', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(1, { date: '2026-04-16' });
      const where = mockHistoryRepository.findAndCount.mock.calls[0][0].where;
      expect(where.changed_at).toBeDefined();
    });

    it('filters by actor, and automated means changed_by IS NULL', async () => {
      mockHistoryRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(1, { changed_by: 12 });
      expect(mockHistoryRepository.findAndCount.mock.calls[0][0].where.changed_by).toBe(12);

      await service.findAllGlobal(1, { automated: true, changed_by: 12 });
      const automatedWhere = mockHistoryRepository.findAndCount.mock.calls[1][0].where;
      expect(automatedWhere.changed_by).toEqual(expect.objectContaining({ _type: 'isNull' }));
    });
  });

  describe('findAll (by reservation)', () => {
    it('should 404 when the reservation is missing, deleted or foreign', async () => {
      mockReservationRepository.exists.mockResolvedValue(false);
      await expect(service.findAll(999, 1)).rejects.toThrow('Reservation not found');
      expect(mockHistoryRepository.findAndCount).not.toHaveBeenCalled();
    });

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
      const entry = { id: 1, reservation: { merchant_id: 1, is_active: true } };
      mockHistoryRepository.findOne.mockResolvedValue(entry);

      const result = await service.findOne(1, 1);
      expect(result.statusCode).toBe(200);
    });

    it('should throw error if merchant mismatch', async () => {
      const entry = { id: 1, reservation: { merchant_id: 2, is_active: true } };
      mockHistoryRepository.findOne.mockResolvedValue(entry);
      await expect(service.findOne(1, 1)).rejects.toThrow(
        'Status history entry not found',
      );
    });

    it('should throw not found when the parent reservation was deleted', async () => {
      const entry = { id: 1, reservation: { merchant_id: 1, is_active: false } };
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
