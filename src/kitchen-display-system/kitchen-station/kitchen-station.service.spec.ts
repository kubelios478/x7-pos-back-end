import { Test, TestingModule } from '@nestjs/testing';
import { KitchenStationService } from './kitchen-station.service';

describe('KitchenStationService', () => {
  let service: KitchenStationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KitchenStationService],
    }).compile();

    service = module.get<KitchenStationService>(KitchenStationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
