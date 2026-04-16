import { Test, TestingModule } from '@nestjs/testing';
import { ReservationGuestController } from './reservation-guest.controller';
import { ReservationGuestService } from './reservation-guest.service';

describe('ReservationGuestController', () => {
  let controller: ReservationGuestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationGuestController],
      providers: [ReservationGuestService],
    }).compile();

    controller = module.get<ReservationGuestController>(ReservationGuestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
