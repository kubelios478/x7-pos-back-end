import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';

describe('ReservationController', () => {
  let controller: ReservationController;
  let service: ReservationService;

  const mockReservationService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('cancel', () => {
    it('should call service.cancel', async () => {
      const mockUser = { merchant: { id: 1 } } as any;
      await controller.cancel(mockUser, 1);
      expect(service.cancel).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      const mockUser = { merchant: { id: 1 } } as any;
      await controller.remove(mockUser, 1);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
