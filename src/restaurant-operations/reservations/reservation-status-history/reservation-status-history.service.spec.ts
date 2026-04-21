import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryService } from './reservation-status-history.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationStatusHistory } from './entities/reservation-status-history.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

describe('ReservationStatusHistoryService', () => {
  let service: ReservationStatusHistoryService;

  const mockRepository = {
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationStatusHistoryService,
        {
          provide: getRepositoryToken(ReservationStatusHistory),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationStatusHistoryService>(ReservationStatusHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
