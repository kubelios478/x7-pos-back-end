//src/configuration/merchant-tip-rule/merchant-tip-rule.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantTipRuleService } from './merchant-tip-rule.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MerchantTipRule } from './entity/merchant-tip-rule-entity';
import { Company } from 'src/companies/entities/company.entity';
import { TipCalculationMethod } from '../constants/tip-calculation-method.enum';
import { TipDistributionMethod } from '../constants/tip-distribution-method.enum';
import { CreateMerchantTipRuleDto } from './dto/create-merchant-tip-rule.dto';
import { UpdateMerchantTipRuleDto } from './dto/update-merchant-tip-rule.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Repository, In } from 'typeorm';

describe('MerchantTipRuleService', () => {
  let service: MerchantTipRuleService;
  let merchantTipRuleRepository: Repository<MerchantTipRule>;
  let companyRepository: Repository<Company>;

  //Mock data
  const mockMerchantTipRule: Partial<MerchantTipRule> = {
    id: 1,
    company: {
      id: 1,
      name: 'Test Company',
      email: 'test@company.com',
      phone: '1234567890',
      rut: '12345678-9',
      address: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      merchants: [],
      customers: [],
      configurations: [],
    } as Company,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'Test User',
    updatedBy: 'Test User',
    status: 'active',
    name: 'Test Merchant Tip Rule',
    tipCalculationMethod: TipCalculationMethod.PERCENTAGE,
    tipDistributionMethod: TipDistributionMethod.INDIVIDUAL,
    suggestedPercentages: [10, 15, 20],
    fixedAmountOptions: [1, 2, 3],
    allowCustomTip: true,
    maximumTipPercentage: 25,
    includeKitchenStaff: false,
    includeManagers: false,
    autoDistribute: true,
  };

  const mockCreateMerchantTipRuleDto: CreateMerchantTipRuleDto = {
    companyId: 1,
    createdBy: 'Test User',
    updatedBy: 'Test User',
    status: 'active',
    name: 'Test Merchant Tip Rule',
    tipCalculationMethod: TipCalculationMethod.PERCENTAGE,
    tipDistributionMethod: TipDistributionMethod.INDIVIDUAL,
    suggestedPercentages: [10, 15, 20],
    fixedAmountOptions: [1, 2, 3],
    allowCustomTip: true,
    maximumTipPercentage: 25,
    includeKitchenStaff: false,
    includeManagers: false,
    autoDistribute: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUpdateMerchantTipRuleDto: UpdateMerchantTipRuleDto = {
    companyId: 1,
    createdBy: 'Test User',
    updatedBy: 'Test User 2',
    status: 'inactive',
    name: 'Updated Merchant Tip Rule',
    tipCalculationMethod: TipCalculationMethod.FIXED_AMOUNT,
    tipDistributionMethod: TipDistributionMethod.POOL,
    suggestedPercentages: [5, 10, 15],
    fixedAmountOptions: [2, 4, 6],
    allowCustomTip: false,
    maximumTipPercentage: 20,
    includeKitchenStaff: true,
    includeManagers: true,
    autoDistribute: false,
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockMerchantTipRule], 1]),
    };

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantTipRuleService,
        {
          provide: getRepositoryToken(MerchantTipRule),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MerchantTipRuleService>(MerchantTipRuleService);
    merchantTipRuleRepository = module.get<Repository<MerchantTipRule>>(
      getRepositoryToken(MerchantTipRule),
    );
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(merchantTipRuleRepository).toBeDefined();
    });
  });

  describe('Create Merchant Tip Rule', () => {
    it('should create and return a merchant tip rule successfully', async () => {
      jest
        .spyOn(merchantTipRuleRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantTipRule);
      jest.spyOn(companyRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Company);

      const createSpy = jest.spyOn(merchantTipRuleRepository, 'create');
      const saveSpy = jest.spyOn(merchantTipRuleRepository, 'save');

      createSpy.mockReturnValue(mockMerchantTipRule as MerchantTipRule);
      saveSpy.mockResolvedValue(mockMerchantTipRule as MerchantTipRule);
      const result = await service.create(mockCreateMerchantTipRuleDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          company: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockMerchantTipRule);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Merchant Tip Rule created successfully',
        data: mockMerchantTipRule,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantTipRuleRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantTipRule);
      jest.spyOn(companyRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Company);

      const createSpy = jest.spyOn(merchantTipRuleRepository, 'create');
      const saveSpy = jest.spyOn(merchantTipRuleRepository, 'save');

      createSpy.mockReturnValue(mockMerchantTipRule as MerchantTipRule);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateMerchantTipRuleDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          company: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockMerchantTipRule);
    });
  });

  describe('Find All Merchant Tip Rules', () => {
    it('should return all merchant tip rules', async () => {
      const mockMerchantTipRules = [mockMerchantTipRule as MerchantTipRule];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = merchantTipRuleRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<MerchantTipRule>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([mockMerchantTipRules, mockMerchantTipRules.length]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Tip Rules retrieved successfully',
        data: mockMerchantTipRules,
        pagination: {
          page: 1,
          limit: 10,
          total: mockMerchantTipRules.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no merchant tip rule found', async () => {
      const qb = merchantTipRuleRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<MerchantTipRule>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Tip Rules retrieved successfully',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });
  });

  describe('Find One Merchant Tip Rule', () => {
    it('should throw error for invalid ID (null)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(service.findOne(null as any)).rejects.toThrow();
    });

    it('should throw error for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow();
    });

    it('should throw error for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow();
    });

    it('should handle not found merchant tip rule', async () => {
      const findOneSpy = jest.spyOn(merchantTipRuleRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Merchant Tip Rule not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['company'],
      });
    });

    it('should return a merchant tip rule when found', async () => {
      const mockFound = {
        id: 1,
        company: {
          id: 1,
        } as Company,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Test User',
        updatedBy: 'Test User',
        status: 'active',
        name: 'Test Merchant Tip Rule',
        tipCalculationMethod: TipCalculationMethod.PERCENTAGE,
        tipDistributionMethod: TipDistributionMethod.INDIVIDUAL,
        suggestedPercentages: [10, 15, 20],
        fixedAmountOptions: [1, 2, 3],
        allowCustomTip: true,
        maximumTipPercentage: 25,
        includeKitchenStaff: false,
        includeManagers: false,
        autoDistribute: true,
      } as MerchantTipRule;

      jest
        .spyOn(merchantTipRuleRepository, 'findOne')
        .mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Tip Rule retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Merchant Tip Rule', () => {
    it('should update and return a merchant tip rule successfully', async () => {
      const updatedMerchantTipRule: Partial<MerchantTipRule> = {
        ...mockMerchantTipRule,
        ...mockUpdateMerchantTipRuleDto,
        company: mockMerchantTipRule.company,
      };

      const findOneSpy = jest.spyOn(merchantTipRuleRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantTipRuleRepository, 'save');

      findOneSpy.mockResolvedValue(mockMerchantTipRule as MerchantTipRule);
      saveSpy.mockResolvedValue(updatedMerchantTipRule as MerchantTipRule);
      const result = await service.update(1, mockUpdateMerchantTipRuleDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['company'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedMerchantTipRule);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Tip Rule updated successfully',
        data: updatedMerchantTipRule,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateMerchantTipRuleDto),
      ).rejects.toThrow();
    });

    it('should throw error when merchant tip rule to update not found', async () => {
      const findOneSpy = jest.spyOn(merchantTipRuleRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateMerchantTipRuleDto),
      ).rejects.toThrow('Merchant Tip Rule not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['company'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(merchantTipRuleRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantTipRuleRepository, 'save');

      findOneSpy.mockResolvedValue(mockMerchantTipRule as MerchantTipRule);
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateMerchantTipRuleDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Merchant Tip Rule', () => {
    it('should remove a merchant tip rule successfully', async () => {
      const findOneSpy = jest.spyOn(merchantTipRuleRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantTipRuleRepository, 'save');

      findOneSpy.mockResolvedValue(mockMerchantTipRule as MerchantTipRule);
      saveSpy.mockResolvedValue(mockMerchantTipRule as MerchantTipRule);

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Tip Rule deleted successfully',
        data: mockMerchantTipRule,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when merchant tip rule to remove not found', async () => {
      const findOneSpy = jest.spyOn(merchantTipRuleRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Merchant Tip Rule not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the merchant tip rule repository', () => {
      expect(merchantTipRuleRepository).toBeDefined();
      expect(typeof merchantTipRuleRepository.find).toBe('function');
      expect(typeof merchantTipRuleRepository.findOne).toBe('function');
      expect(typeof merchantTipRuleRepository.create).toBe('function');
      expect(typeof merchantTipRuleRepository.save).toBe('function');
      expect(typeof merchantTipRuleRepository.remove).toBe('function');
    });
  });
});
