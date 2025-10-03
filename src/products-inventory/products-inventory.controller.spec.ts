import { Test, TestingModule } from '@nestjs/testing';
import { ProductsInventoryController } from './products-inventory.controller';

describe('ProductsInventoryController', () => {
  let controller: ProductsInventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsInventoryController],
    }).compile();

    controller = module.get<ProductsInventoryController>(ProductsInventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
