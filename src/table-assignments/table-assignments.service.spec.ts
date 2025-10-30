import { Test, TestingModule } from '@nestjs/testing';
import { TableAssignmentsService } from './table-assignments.service';

describe('TableAssignmentsService', () => {
  let service: TableAssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TableAssignmentsService],
    }).compile();

    service = module.get<TableAssignmentsService>(TableAssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
