//src/configuration/merchant-overtime-rule/merchant-overtime-rule.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MerchantOvertimeRuleService } from './merchant-overtime-rule.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MerchantOvertimeRule } from './entity/merchant-overtime-rule.entity';
import { Company } from 'src/companies/entities/company.entity';
import { OvertimeCalculationType } from '../constants/overtime-calculation-type.enum';
import { OvertimeRateType } from '../constants/overtime-rate-type.enum';
import { CreateMerchantOvertimeRuleDto } from './dto/create-merchant-overtime-rule.dto';
import { UpdateMerchantOvertimeRuleDto } from './dto/update-merchant-overtime-rule.dto';
import { SelectQueryBuilder } from 'typeorm';
import { Repository, In } from 'typeorm';
import { User } from 'src/users/entities/user.entity';

describe('MerchantOvertimeRuleService', () => {
  let service: MerchantOvertimeRuleService;
  let merchantOvertimeRuleRepository: Repository<MerchantOvertimeRule>;
  let companyRepository: Repository<Company>;
  let userRepository: Repository<User>;

  //Mock Data
  const mockMerchantOvertimeRule: Partial<MerchantOvertimeRule> = {
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
    createdBy: { id: 1 } as User,
    updatedBy: { id: 1 } as User,
    status: 'active',
    name: 'Test Merchant Overtime Rule',
    description: 'Description of the Overtime Rule',
    calculationMethod: OvertimeCalculationType.DAILY,
    rateMethod: OvertimeRateType.MULTIPLIER,
    thresholdHours: 8,
    maxHours: 10,
    rateValue: 200,
    appliesOnHolidays: true,
    appliesOnWeekends: true,
    priority: 10,
  };

  const mockCreateMerchantOvertimeRuleDto: CreateMerchantOvertimeRuleDto = {
    companyId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 1,
    updatedById: 1,
    status: 'active',
    name: 'Test Merchant Overtime Rule',
    description: 'Description of the Overtime Rule',
    calculationMethod: OvertimeCalculationType.DAILY,
    rateMethod: OvertimeRateType.MULTIPLIER,
    thresholdHours: 8,
    maxHours: 10,
    rateValue: 200,
    appliesOnHolidays: true,
    appliesOnWeekends: true,
    priority: 10,
  };

  const mockUpdateMerchantOvertimeRuleDto: UpdateMerchantOvertimeRuleDto = {
    companyId: 1,
    createdById: 1,
    updatedById: 1,
    status: 'inactive',
    name: 'Test Merchant Overtime Rule 2',
    description: 'Description of the Overtime Rule 2',
    calculationMethod: OvertimeCalculationType.HOLIDAY,
    rateMethod: OvertimeRateType.FIXED_AMOUNT,
    thresholdHours: 8,
    maxHours: 10,
    rateValue: 200,
    appliesOnHolidays: false,
    appliesOnWeekends: false,
    priority: 10,
  };

  beforeEach(async () => {
    const mockQueryBuilder: any = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([[mockMerchantOvertimeRule], 1]),
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
        MerchantOvertimeRuleService,
        {
          provide: getRepositoryToken(MerchantOvertimeRule),
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
        {
          provide: getRepositoryToken(User),
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

    service = module.get<MerchantOvertimeRuleService>(
      MerchantOvertimeRuleService,
    );
    merchantOvertimeRuleRepository = module.get<
      Repository<MerchantOvertimeRule>
    >(getRepositoryToken(MerchantOvertimeRule));
    companyRepository = module.get<Repository<Company>>(
      getRepositoryToken(Company),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
    it('repository should be defined', () => {
      expect(merchantOvertimeRuleRepository).toBeDefined();
    });
  });

  describe('Create Merchant Overtime Rule', () => {
    it('should create and return a merchant overtime rule successfully', async () => {
      jest
        .spyOn(merchantOvertimeRuleRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantOvertimeRule);
      jest.spyOn(companyRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Company);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as User);

      const createSpy = jest.spyOn(merchantOvertimeRuleRepository, 'create');
      const saveSpy = jest.spyOn(merchantOvertimeRuleRepository, 'save');

      createSpy.mockReturnValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );
      saveSpy.mockResolvedValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );
      const result = await service.create(mockCreateMerchantOvertimeRuleDto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          company: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockMerchantOvertimeRule);
      expect(result).toEqual({
        statusCode: 201,
        message: 'Merchant Overtime Rule created successfully',
        data: mockMerchantOvertimeRule,
      });
    });

    it('should handle database errors during creation', async () => {
      jest
        .spyOn(merchantOvertimeRuleRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as MerchantOvertimeRule);
      jest.spyOn(companyRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as Company);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue({
        id: 1,
      } as User);

      const createSpy = jest.spyOn(merchantOvertimeRuleRepository, 'create');
      const saveSpy = jest.spyOn(merchantOvertimeRuleRepository, 'save');

      createSpy.mockReturnValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create(mockCreateMerchantOvertimeRuleDto),
      ).rejects.toThrow('Database error');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          company: { id: 1 },
        }),
      );
      expect(saveSpy).toHaveBeenCalledWith(mockMerchantOvertimeRule);
    });
  });

  describe('Find All Merchant Overtime Rules', () => {
    it('should return all merchant overtime rules', async () => {
      const mockMerchantOvertimeRules = [
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      ];

      // QueryBuilder ya mockeado en el beforeEach
      const qb = merchantOvertimeRuleRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<MerchantOvertimeRule>
      >;

      jest
        .spyOn(qb, 'getManyAndCount')
        .mockResolvedValue([
          mockMerchantOvertimeRules,
          mockMerchantOvertimeRules.length,
        ]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Overtime Rules retrieved successfully',
        data: mockMerchantOvertimeRules,
        pagination: {
          page: 1,
          limit: 10,
          total: mockMerchantOvertimeRules.length,
          totalPages: 1,
        },
      });
    });

    it('should return an empty array when no merchant overtime rule found', async () => {
      const qb = merchantOvertimeRuleRepository.createQueryBuilder() as Partial<
        SelectQueryBuilder<MerchantOvertimeRule>
      >;

      jest.spyOn(qb, 'getManyAndCount').mockResolvedValue([[], 0]);

      const result = await service.findAll({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Overtime Rules retrieved successfully',
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

  describe('Find One Merchant Overtime Rule', () => {
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

    it('should handle not found merchant overtime rule', async () => {
      const findOneSpy = jest.spyOn(merchantOvertimeRuleRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Merchant Overtime Rule not found',
      );

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['company', 'createdBy', 'updatedBy'],
      });
    });

    it('should return a merchant overtime rule when found', async () => {
      const mockFound = {
        id: 1,
        company: {
          id: 1,
        } as Company,
        createdBy: { id: 1 } as User,
        updatedBy: { id: 1 } as User,
        status: 'active',
        name: 'Test Merchant Overtime Rule',
        description: 'Description of the Overtime Rule',
        calculationMethod: OvertimeCalculationType.DAILY,
        rateMethod: OvertimeRateType.MULTIPLIER,
        thresholdHours: 8,
        maxHours: 10,
        rateValue: 200,
        appliesOnHolidays: true,
        appliesOnWeekends: true,
        priority: 10,
      } as MerchantOvertimeRule;

      jest
        .spyOn(merchantOvertimeRuleRepository, 'findOne')
        .mockResolvedValue(mockFound);

      const result = await service.findOne(1);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Overtime Rule retrieved successfully',
        data: mockFound,
      });
    });
  });

  describe('Update Merchant Overtime Rule', () => {
    it('should update and return a merchant overtime rule successfully', async () => {
      const updatedMerchantOvertimeRule: Partial<MerchantOvertimeRule> = {
        ...mockMerchantOvertimeRule,
        ...mockUpdateMerchantOvertimeRuleDto,
        company: mockMerchantOvertimeRule.company,
        createdBy: mockMerchantOvertimeRule.createdBy,
        updatedBy: mockMerchantOvertimeRule.updatedBy,
      };

      const findOneSpy = jest.spyOn(merchantOvertimeRuleRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantOvertimeRuleRepository, 'save');

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as User);
      jest
        .spyOn(companyRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Company);

      findOneSpy.mockResolvedValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );
      saveSpy.mockResolvedValue(
        updatedMerchantOvertimeRule as MerchantOvertimeRule,
      );
      const result = await service.update(1, mockUpdateMerchantOvertimeRuleDto);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
          status: In(['active', 'inactive']),
        },
        relations: ['company'],
      });
      expect(saveSpy).toHaveBeenCalledWith(updatedMerchantOvertimeRule);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Overtime Rule updated successfully',
        data: updatedMerchantOvertimeRule,
      });
    });

    it('should throw error for invalid ID during update', async () => {
      await expect(
        service.update(0, mockUpdateMerchantOvertimeRuleDto),
      ).rejects.toThrow();
    });

    it('should throw error when merchant overtime rule to update not found', async () => {
      const findOneSpy = jest.spyOn(merchantOvertimeRuleRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(
        service.update(999, mockUpdateMerchantOvertimeRuleDto),
      ).rejects.toThrow('Merchant Overtime Rule not found');
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
          status: In(['active', 'inactive']),
        },
        relations: ['company'],
      });
    });

    it('should handle database errors during update', async () => {
      const findOneSpy = jest.spyOn(merchantOvertimeRuleRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantOvertimeRuleRepository, 'save');

      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as User);
      jest
        .spyOn(companyRepository, 'findOne')
        .mockResolvedValue({ id: 1 } as Company);

      findOneSpy.mockResolvedValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );
      saveSpy.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update(1, mockUpdateMerchantOvertimeRuleDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('Remove Merchant Overtime Rule', () => {
    it('should remove a merchant  rule successfully', async () => {
      const findOneSpy = jest.spyOn(merchantOvertimeRuleRepository, 'findOne');
      const saveSpy = jest.spyOn(merchantOvertimeRuleRepository, 'save');

      findOneSpy.mockResolvedValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );
      saveSpy.mockResolvedValue(
        mockMerchantOvertimeRule as MerchantOvertimeRule,
      );

      const result = await service.remove(1);

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
      expect(saveSpy).toHaveBeenCalled();
      expect(result).toEqual({
        statusCode: 200,
        message: 'Merchant Overtime Rule deleted successfully',
        data: mockMerchantOvertimeRule,
      });
    });

    it('should throw error for invalid ID during removal', async () => {
      await expect(service.remove(0)).rejects.toThrow();
    });

    it('should throw error when merchant overtime rule to remove not found', async () => {
      const findOneSpy = jest.spyOn(merchantOvertimeRuleRepository, 'findOne');
      findOneSpy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Merchant Overtime Rule not found',
      );
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 999,
        },
      });
    });
  });

  describe('Repository Integration', () => {
    it('should properly integrate with the merchant overtime rule repository', () => {
      expect(merchantOvertimeRuleRepository).toBeDefined();
      expect(typeof merchantOvertimeRuleRepository.find).toBe('function');
      expect(typeof merchantOvertimeRuleRepository.findOne).toBe('function');
      expect(typeof merchantOvertimeRuleRepository.create).toBe('function');
      expect(typeof merchantOvertimeRuleRepository.save).toBe('function');
      expect(typeof merchantOvertimeRuleRepository.remove).toBe('function');
    });
  });
});
