import { Test, TestingModule } from '@nestjs/testing';
import { ReservationGuestService } from './reservation-guest.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationGuest } from './entities/reservation-guest.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';

describe('ReservationGuestService', () => {
  let service: ReservationGuestService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationGuestService,
        {
          provide: getRepositoryToken(ReservationGuest),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationGuestService>(ReservationGuestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
