import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryController } from './reservation-status-history.controller';
import { ReservationStatusHistoryService } from './reservation-status-history.service';

describe('ReservationStatusHistoryController', () => {
  let controller: ReservationStatusHistoryController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationStatusHistoryController],
      providers: [
        {
          provide: ReservationStatusHistoryService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReservationStatusHistoryController>(ReservationStatusHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
