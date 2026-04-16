import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableService } from './reservation-table.service';

describe('ReservationTableService', () => {
  let service: ReservationTableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationTableService],
    }).compile();

    service = module.get<ReservationTableService>(ReservationTableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
