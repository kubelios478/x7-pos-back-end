import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableController } from './reservation-table.controller';
import { ReservationTableService } from './reservation-table.service';

describe('ReservationTableController', () => {
  let controller: ReservationTableController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    merchant: { id: 1 },
    user: { id: 1, role: 'merchant_admin' },
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

    controller = module.get<ReservationTableController>(
      ReservationTableController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create service', async () => {
    const dto = { reservation_id: 1, table_id: 1 };
    await controller.create(mockUser as any, dto);
    expect(mockService.create).toHaveBeenCalledWith(dto, mockUser.merchant.id);
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

  it('should call update service', async () => {
    const dto = { is_active: false };
    await controller.update(mockUser as any, 1, dto);
    expect(mockService.update).toHaveBeenCalledWith(
      1,
      dto,
      mockUser.merchant.id,
    );
  });

  it('should call remove service', async () => {
    await controller.remove(mockUser as any, 1, 2);
    expect(mockService.remove).toHaveBeenCalledWith(1, 2, mockUser.merchant.id);
  });
});
