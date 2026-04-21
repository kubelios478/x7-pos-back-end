import { Test, TestingModule } from '@nestjs/testing';
import { ReservationGuestController } from './reservation-guest.controller';
import { ReservationGuestService } from './reservation-guest.service';

describe('ReservationGuestController', () => {
  let controller: ReservationGuestController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationGuestController],
      providers: [
        {
          provide: ReservationGuestService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReservationGuestController>(ReservationGuestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
