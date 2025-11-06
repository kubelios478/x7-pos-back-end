import { Test, TestingModule } from '@nestjs/testing';
import { CashDrawersController } from './cash-drawers.controller';
import { CashDrawersService } from './cash-drawers.service';

describe('CashDrawersController', () => {
  let controller: CashDrawersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashDrawersController],
      providers: [CashDrawersService],
    }).compile();

    controller = module.get<CashDrawersController>(CashDrawersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
