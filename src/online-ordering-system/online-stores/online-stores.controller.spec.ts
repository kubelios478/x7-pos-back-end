import { Test, TestingModule } from '@nestjs/testing';
import { OnlineStoresController } from './online-stores.controller';
import { OnlineStoresService } from './online-stores.service';

describe('OnlineStoresController', () => {
  let controller: OnlineStoresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnlineStoresController],
      providers: [OnlineStoresService],
    }).compile();

    controller = module.get<OnlineStoresController>(OnlineStoresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
