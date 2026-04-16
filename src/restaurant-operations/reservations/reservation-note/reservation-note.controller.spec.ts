import { Test, TestingModule } from '@nestjs/testing';
import { ReservationNoteController } from './reservation-note.controller';
import { ReservationNoteService } from './reservation-note.service';

describe('ReservationNoteController', () => {
  let controller: ReservationNoteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationNoteController],
      providers: [ReservationNoteService],
    }).compile();

    controller = module.get<ReservationNoteController>(ReservationNoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
