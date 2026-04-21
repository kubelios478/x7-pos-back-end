import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableService } from './reservation-table.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationTable } from './entities/reservation-table.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';

describe('ReservationTableService', () => {
  let service: ReservationTableService;

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
        ReservationTableService,
        {
          provide: getRepositoryToken(ReservationTable),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Table),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ReservationTableService>(ReservationTableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
