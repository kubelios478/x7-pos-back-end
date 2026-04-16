import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryController } from './reservation-status-history.controller';
import { ReservationStatusHistoryService } from './reservation-status-history.service';

describe('ReservationStatusHistoryController', () => {
  let controller: ReservationStatusHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationStatusHistoryController],
      providers: [ReservationStatusHistoryService],
    }).compile();

    controller = module.get<ReservationStatusHistoryController>(ReservationStatusHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
