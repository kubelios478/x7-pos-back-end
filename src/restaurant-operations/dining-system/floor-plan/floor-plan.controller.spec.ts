import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FloorPlanController } from './floor-plan.controller';
import { FloorPlanService } from './floor-plan.service';

describe('FloorPlanController', () => {
  let controller: FloorPlanController;

  const mockFloorPlanService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FloorPlanController],
      providers: [
        {
          provide: FloorPlanService,
          useValue: mockFloorPlanService,
        },
      ],
    }).compile();

    controller = module.get<FloorPlanController>(FloorPlanController);
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
