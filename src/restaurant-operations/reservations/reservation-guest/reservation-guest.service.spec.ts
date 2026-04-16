import { Test, TestingModule } from '@nestjs/testing';
import { ReservationGuestService } from './reservation-guest.service';

describe('ReservationGuestService', () => {
  let service: ReservationGuestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationGuestService],
    }).compile();

    service = module.get<ReservationGuestService>(ReservationGuestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
