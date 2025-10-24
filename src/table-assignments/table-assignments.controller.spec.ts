import { Test, TestingModule } from '@nestjs/testing';
import { TableAssignmentsController } from './table-assignments.controller';
import { TableAssignmentsService } from './table-assignments.service';

describe('TableAssignmentsController', () => {
  let controller: TableAssignmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TableAssignmentsController],
      providers: [TableAssignmentsService],
    }).compile();

    controller = module.get<TableAssignmentsController>(TableAssignmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
