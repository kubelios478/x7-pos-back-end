import { Test, TestingModule } from '@nestjs/testing';
import { ReservationNoteService } from './reservation-note.service';

describe('ReservationNoteService', () => {
  let service: ReservationNoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationNoteService],
    }).compile();

    service = module.get<ReservationNoteService>(ReservationNoteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
