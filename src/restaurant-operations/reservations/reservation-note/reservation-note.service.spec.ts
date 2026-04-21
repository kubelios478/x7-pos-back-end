import { Test, TestingModule } from '@nestjs/testing';
import { ReservationNoteService } from './reservation-note.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationNote } from './entities/reservation-note.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

describe('ReservationNoteService', () => {
  let service: ReservationNoteService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationNoteService,
        {
          provide: getRepositoryToken(ReservationNote),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationNoteService>(ReservationNoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
