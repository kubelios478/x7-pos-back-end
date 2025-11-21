import { Test, TestingModule } from '@nestjs/testing';
import { KitchenStationController } from './kitchen-station.controller';
import { KitchenStationService } from './kitchen-station.service';

describe('KitchenStationController', () => {
  let controller: KitchenStationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchenStationController],
      providers: [KitchenStationService],
    }).compile();

    controller = module.get<KitchenStationController>(KitchenStationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
