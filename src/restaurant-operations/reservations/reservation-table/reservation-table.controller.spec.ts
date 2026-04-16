import { Test, TestingModule } from '@nestjs/testing';
import { ReservationTableController } from './reservation-table.controller';
import { ReservationTableService } from './reservation-table.service';

describe('ReservationTableController', () => {
  let controller: ReservationTableController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationTableController],
      providers: [ReservationTableService],
    }).compile();

    controller = module.get<ReservationTableController>(ReservationTableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
