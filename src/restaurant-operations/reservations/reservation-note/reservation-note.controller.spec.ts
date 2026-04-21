import { Test, TestingModule } from '@nestjs/testing';
import { ReservationNoteController } from './reservation-note.controller';
import { ReservationNoteService } from './reservation-note.service';

describe('ReservationNoteController', () => {
  let controller: ReservationNoteController;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationNoteController],
      providers: [
        {
          provide: ReservationNoteService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReservationNoteController>(ReservationNoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
