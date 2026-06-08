import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryController } from './reservation-status-history.controller';
import { ReservationStatusHistoryService } from './reservation-status-history.service';

describe('ReservationStatusHistoryController', () => {
  let controller: ReservationStatusHistoryController;

  const mockService = {
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser = {
    merchant: { id: 1 },
    user: { id: 1, role: 'merchant_admin' },
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

    controller = module.get<ReservationStatusHistoryController>(
      ReservationStatusHistoryController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAllGlobal service', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAllGlobal(mockUser as any, query);
    expect(mockService.findAllGlobal).toHaveBeenCalledWith(
      mockUser.merchant.id,
      query,
    );
  });

  it('should call findAll (by reservation) service', async () => {
    await controller.findAll(mockUser as any, 1, 1, 10);
    expect(mockService.findAll).toHaveBeenCalledWith(
      1,
      mockUser.merchant.id,
      1,
      10,
    );
  });

  it('should call findOne service', async () => {
    await controller.findOne(mockUser as any, 1);
    expect(mockService.findOne).toHaveBeenCalledWith(1, mockUser.merchant.id);
  });
});
