import { Test, TestingModule } from '@nestjs/testing';
import { OnlineStoresService } from './online-stores.service';

describe('OnlineStoresService', () => {
  let service: OnlineStoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OnlineStoresService],
    }).compile();

    service = module.get<OnlineStoresService>(OnlineStoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
