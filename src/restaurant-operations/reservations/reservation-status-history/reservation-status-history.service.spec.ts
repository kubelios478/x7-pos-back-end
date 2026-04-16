import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatusHistoryService } from './reservation-status-history.service';

describe('ReservationStatusHistoryService', () => {
  let service: ReservationStatusHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationStatusHistoryService],
    }).compile();

    service = module.get<ReservationStatusHistoryService>(ReservationStatusHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
