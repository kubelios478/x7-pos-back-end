import { Test, TestingModule } from '@nestjs/testing';
import { ReservationGuestService } from './reservation-guest.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationGuest } from './entities/reservation-guest.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

describe('ReservationGuestService', () => {
  let service: ReservationGuestService;

  const mockGuestRepository = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationGuestService,
        {
          provide: getRepositoryToken(ReservationGuest),
          useValue: mockGuestRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationGuestService>(ReservationGuestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = { reservation_id: 1, name: 'John Doe' };
    const merchantId = 1;

    it('should create a guest successfully', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      const result = await service.create(createDto, merchantId);
      expect(result.statusCode).toBe(201);
      expect(result.data.name).toBe(createDto.name);
    });

    it('should fail if reservation belongs to another merchant', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(createDto, merchantId)).rejects.toThrow(
        'Reservation not found or does not belong to your merchant',
      );
    });

    it('should fail if reservation is not active', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(createDto, merchantId)).rejects.toThrow(
        'Reservation not found or does not belong to your merchant',
      );
    });
  });

  describe('findAllGlobal', () => {
    const merchantId = 1;

    it('should return paginated and mapped guests', async () => {
      const guests = [{ id: 1, name: 'John', reservation: { merchant_id: 1 } }];
      mockGuestRepository.findAndCount.mockResolvedValue([guests, 1]);

      const result = await service.findAllGlobal(merchantId, {
        page: 1,
        limit: 10,
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John');
    });

    it('should apply ILike filter when name is provided', async () => {
      mockGuestRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { name: 'John' });

      expect(mockGuestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.anything(), // ILike is an object at runtime
          }),
        }),
      );
    });

    it('should filter by reservation_id if provided', async () => {
      mockGuestRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { reservation_id: 10 });

      expect(mockGuestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservation_id: 10,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a guest by ID if merchant matches', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'John',
        reservation: { merchant_id: 1 },
      });
      const result = await service.findOne(1, 1);
      expect(result.data.id).toBe(1);
    });

    it('should throw if guest belongs to another merchant', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'John',
        reservation: { merchant_id: 2 },
      });
      await expect(service.findOne(1, 1)).rejects.toThrow('Guest not found');
    });

    it('should throw if guest not found', async () => {
      mockGuestRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow('Guest not found');
    });
  });

  describe('update', () => {
    it('should update guest info successfully', async () => {
      const guest = { id: 1, name: 'Old', reservation: { merchant_id: 1 } };
      mockGuestRepository.findOne.mockResolvedValue(guest);
      mockGuestRepository.findOneBy.mockResolvedValue(guest);

      const result = await service.update(
        1,
        { name: 'New', email: 'new@test.com' },
        1,
      );
      expect(result.data.name).toBe('New');
      expect(mockGuestRepository.save).toHaveBeenCalled();
    });

    it('should fail if guest belongs to another merchant', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        reservation: { merchant_id: 2 },
      });
      await expect(service.update(1, { name: 'New' }, 1)).rejects.toThrow(
        'Guest not found',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete guest successfully', async () => {
      const guest = { id: 1, is_active: true, reservation: { merchant_id: 1 } };
      mockGuestRepository.findOne.mockResolvedValue(guest);
      mockGuestRepository.findOneBy.mockResolvedValue(guest);

      const result = await service.remove(1, 1);
      expect(guest.is_active).toBe(false);
      expect(mockGuestRepository.save).toHaveBeenCalledWith(guest);
      expect(result.statusCode).toBe(200);
    });

    it('should fail if guest belongs to another merchant', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        reservation: { merchant_id: 2 },
      });
      await expect(service.remove(1, 1)).rejects.toThrow('Guest not found');
    });
  });
});
