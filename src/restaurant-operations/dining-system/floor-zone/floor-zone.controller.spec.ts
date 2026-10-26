import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FloorZoneController } from './floor-zone.controller';
import { FloorZoneService } from './floor-zone.service';

describe('FloorZoneController', () => {
  let controller: FloorZoneController;

  const mockFloorZoneService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FloorZoneController],
      providers: [
        {
          provide: FloorZoneService,
          useValue: mockFloorZoneService,
        },
      ],
    }).compile();

    controller = module.get<FloorZoneController>(FloorZoneController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('answers 400, not 500, for a non-positive id', async () => {
    await expect(controller.findOne(0, {} as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
