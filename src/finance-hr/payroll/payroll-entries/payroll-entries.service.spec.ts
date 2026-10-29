import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PayrollEntriesService } from './payroll-entries.service';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollRun } from '../payroll-runs/entities/payroll-run.entity';
import { Collaborator } from '../../hr/collaborators/entities/collaborator.entity';

describe('PayrollEntriesService', () => {
  let service: PayrollEntriesService;

  const mockEntryRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };

  const mockPayrollRunRepo = { findOne: jest.fn(), exists: jest.fn() };
  const mockCollaboratorRepo = { findOne: jest.fn(), exists: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollEntriesService,
        { provide: getRepositoryToken(PayrollEntry), useValue: mockEntryRepo },
        {
          provide: getRepositoryToken(PayrollRun),
          useValue: mockPayrollRunRepo,
        },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: mockCollaboratorRepo,
        },
      ],
    }).compile();

    service = module.get<PayrollEntriesService>(PayrollEntriesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payroll entry successfully', async () => {
      const dto = {
        payroll_run_id: 1,
        collaborator_id: 1,
        base_pay: 50000,
        net_total: 45000,
      };
      const saved = {
        id: 1,
        ...dto,
        created_at: new Date(),
        deleted_at: null,
      };
      mockPayrollRunRepo.findOne.mockResolvedValue({ id: 1 });
      mockCollaboratorRepo.findOne.mockResolvedValue({ id: 1 });
      mockEntryRepo.create.mockReturnValue(saved);
      mockEntryRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(result.statusCode).toBe(201);
      expect(result.message).toBe('Payroll entry created successfully');
      expect(result.data.id).toBe(1);
    });

    it('should throw NotFoundException when payroll run does not exist', async () => {
      mockPayrollRunRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          payroll_run_id: 999,
          collaborator_id: 1,
        }),
      ).rejects.toThrow('Payroll run with ID 999 not found');
    });
  });

  describe('merchant scope', () => {
    afterEach(() => jest.clearAllMocks());

    it("lists only entries of the merchant's payroll runs", async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockEntryRepo.createQueryBuilder.mockReturnValueOnce(qb as never);

      await service.findAll({}, 7);

      expect(qb.innerJoin).toHaveBeenCalledWith('entry.payrollRun', 'scopeRun');
      expect(qb.andWhere).toHaveBeenCalledWith(
        'scopeRun.merchant_id = :scopedMerchantId',
        { scopedMerchantId: 7 },
      );
    });

    it("looks up a single entry within the merchant's runs", async () => {
      mockEntryRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(5, 7)).rejects.toThrow(
        'Payroll entry with ID 5 not found',
      );
      expect(mockEntryRepo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: 5,
          payrollRun: { merchant_id: 7 },
        }),
      });
    });

    it("rejects creating an entry in another merchant's run", async () => {
      mockPayrollRunRepo.exists.mockResolvedValue(false);

      await expect(
        service.create({ payroll_run_id: 9, collaborator_id: 1 }, 7),
      ).rejects.toThrow('You can only access payroll data of your merchant');
      expect(mockPayrollRunRepo.exists).toHaveBeenCalledWith({
        where: { id: 9, merchant_id: 7 },
      });
      expect(mockEntryRepo.save).not.toHaveBeenCalled();
    });

    it('does not restrict portal users', async () => {
      mockPayrollRunRepo.findOne.mockResolvedValue({ id: 9 });
      mockCollaboratorRepo.findOne.mockResolvedValue({ id: 1 });
      mockEntryRepo.create.mockReturnValue({ id: 1 });
      mockEntryRepo.save.mockResolvedValue({ id: 1 });

      await service.create({ payroll_run_id: 9, collaborator_id: 1 });

      expect(mockPayrollRunRepo.exists).not.toHaveBeenCalled();
    });
  });
});
