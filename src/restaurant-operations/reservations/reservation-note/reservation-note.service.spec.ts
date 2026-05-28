import { Test, TestingModule } from '@nestjs/testing';
import { ReservationNoteService } from './reservation-note.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationNote } from './entities/reservation-note.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';

describe('ReservationNoteService', () => {
  let service: ReservationNoteService;

  const mockNoteRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto, created_at: new Date() })),
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
        ReservationNoteService,
        {
          provide: getRepositoryToken(ReservationNote),
          useValue: mockNoteRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationNoteService>(ReservationNoteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createNoteDto = {
      reservation_id: 1,
      note: 'Test note',
      created_by: 1,
    };
    const merchantId = 1;

    it('should create a note successfully', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({ id: 1, merchant_id: 1, is_active: true });

      const result = await service.create(createNoteDto, merchantId);

      expect(result.statusCode).toBe(201);
      expect(result.data.note).toBe(createNoteDto.note);
      expect(mockNoteRepository.save).toHaveBeenCalled();
    });

    it('should fail if reservation belongs to another merchant', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(createNoteDto, merchantId)).rejects.toThrow('Reservation not found or does not belong to your merchant');
    });

    it('should fail if reservation is not active', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null); // findOneBy matches is_active: true
      await expect(service.create(createNoteDto, merchantId)).rejects.toThrow('Reservation not found');
    });
  });

  describe('findAllGlobal', () => {
    const merchantId = 1;

    it('should return paginated and mapped notes', async () => {
      const notes = [{ id: 1, note: 'Note 1', reservation: { merchant_id: 1 } }];
      mockNoteRepository.findAndCount.mockResolvedValue([notes, 1]);

      const result = await service.findAllGlobal(merchantId, { page: 1, limit: 10 });

      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by reservation_id if provided', async () => {
      mockNoteRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { reservation_id: 10 });

      expect(mockNoteRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          reservation_id: 10
        })
      }));
    });

    it('should filter by created_by if provided', async () => {
      mockNoteRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { created_by: 5 });

      expect(mockNoteRepository.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          created_by: 5
        })
      }));
    });
  });

  describe('findOne', () => {
    it('should return a note if it belongs to merchant', async () => {
      const note = { id: 1, note: 'Test', reservation: { merchant_id: 1 } };
      mockNoteRepository.findOne.mockResolvedValue(note);

      const result = await service.findOne(1, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.id).toBe(1);
    });

    it('should throw error if note belongs to another merchant', async () => {
      const note = { id: 1, note: 'Test', reservation: { merchant_id: 2 } };
      mockNoteRepository.findOne.mockResolvedValue(note);

      await expect(service.findOne(1, 1)).rejects.toThrow('Note not found');
    });

    it('should throw error if note not found', async () => {
      mockNoteRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1, 1)).rejects.toThrow('Note not found');
    });
  });

  describe('update', () => {
    it('should update a note successfully', async () => {
      const note = { id: 1, note: 'Old', reservation: { merchant_id: 1 } };
      mockNoteRepository.findOne.mockResolvedValue(note);
      mockNoteRepository.findOneBy.mockResolvedValue(note);

      const result = await service.update(1, { note: 'New' }, 1);

      expect(result.statusCode).toBe(200);
      expect(result.data.note).toBe('New');
    });

    it('should fail if note belongs to another merchant', async () => {
      const note = { id: 1, reservation: { merchant_id: 2 } };
      mockNoteRepository.findOne.mockResolvedValue(note);

      await expect(service.update(1, { note: 'New' }, 1)).rejects.toThrow('Note not found');
    });
  });

  describe('remove', () => {
    it('should deactivate a note successfully', async () => {
      const note = { id: 1, is_active: true, reservation: { merchant_id: 1 } };
      mockNoteRepository.findOne.mockResolvedValue(note);
      mockNoteRepository.findOneBy.mockResolvedValue(note);

      const result = await service.remove(1, 1);

      expect(result.statusCode).toBe(200);
      expect(note.is_active).toBe(false);
      expect(mockNoteRepository.save).toHaveBeenCalledWith(note);
    });

    it('should fail if note belongs to another merchant', async () => {
      const note = { id: 1, reservation: { merchant_id: 2 } };
      mockNoteRepository.findOne.mockResolvedValue(note);

      await expect(service.remove(1, 1)).rejects.toThrow('Note not found');
    });
  });
});
