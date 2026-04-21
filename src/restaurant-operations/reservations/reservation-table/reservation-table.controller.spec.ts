import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableController } from './reservation-table.controller';
import { ReservationTableService } from './reservation-table.service';

describe('ReservationTableController', () => {
  let controller: ReservationTableController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationTableController],
      providers: [
        {
          provide: ReservationTableService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReservationTableController>(ReservationTableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
