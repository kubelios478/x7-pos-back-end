import { Test, TestingModule } from '@nestjs/testing';
import { LoyaltyTierService } from './loyalty-tier.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { Repository } from 'typeorm';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from '../../common/constants/error-messages';

describe('LoyaltyTierService', () => {
  let service: LoyaltyTierService;
  let loyaltyTierRepo: Repository<LoyaltyTier>;
  let loyaltyProgramRepo: Repository<LoyaltyProgram>;

  const mockLoyaltyTierRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockLoyaltyProgramRepo = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyTierService,
        {
          provide: getRepositoryToken(LoyaltyTier),
          useValue: mockLoyaltyTierRepo,
        },
        {
          provide: getRepositoryToken(LoyaltyProgram),
          useValue: mockLoyaltyProgramRepo,
        },
      ],
    }).compile();

    service = module.get<LoyaltyTierService>(LoyaltyTierService);
    loyaltyTierRepo = module.get<Repository<LoyaltyTier>>(
      getRepositoryToken(LoyaltyTier),
    );
    loyaltyProgramRepo = module.get<Repository<LoyaltyProgram>>(
      getRepositoryToken(LoyaltyProgram),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new loyalty tier', async () => {
      const createLoyaltyTierDto: CreateLoyaltyTierDto = {
        name: 'Gold',
        loyalty_program_id: 1,
        level: 1,
        min_points: 100,
        multiplier: 1,
      };
      const merchant_id = 1;
      const loyaltyProgram = { id: 1, merchantId: merchant_id, is_active: true };
      const newLoyaltyTier = { id: 1, ...createLoyaltyTierDto, is_active: true };

      mockLoyaltyProgramRepo.findOneBy.mockResolvedValue(loyaltyProgram);
      mockLoyaltyTierRepo.findOneBy.mockResolvedValue(null);
      mockLoyaltyTierRepo.findOne.mockResolvedValue(null);
      mockLoyaltyTierRepo.create.mockReturnValue(newLoyaltyTier);
      mockLoyaltyTierRepo.save.mockResolvedValue(newLoyaltyTier);
      
      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(newLoyaltyTier as any);

      const result = await service.create(merchant_id, createLoyaltyTierDto);

      expect(mockLoyaltyProgramRepo.findOneBy).toHaveBeenCalledWith({
        id: createLoyaltyTierDto.loyalty_program_id,
        merchantId: merchant_id,
        is_active: true,
      });
      expect(mockLoyaltyTierRepo.findOneBy).toHaveBeenCalledWith({
        name: createLoyaltyTierDto.name,
        loyalty_program_id: createLoyaltyTierDto.loyalty_program_id,
        is_active: true,
      });
      expect(mockLoyaltyTierRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: createLoyaltyTierDto.name,
          loyalty_program_id: createLoyaltyTierDto.loyalty_program_id,
          is_active: false,
        },
      });
      expect(mockLoyaltyTierRepo.create).toHaveBeenCalledWith(createLoyaltyTierDto);
      expect(mockLoyaltyTierRepo.save).toHaveBeenCalledWith(newLoyaltyTier);
      expect(findOneSpy).toHaveBeenCalledWith(newLoyaltyTier.id, 'Created');
      expect(result).toEqual(newLoyaltyTier);
    });

    it('should reactivate an inactive loyalty tier', async () => {
      const createLoyaltyTierDto: CreateLoyaltyTierDto = {
        name: 'Gold',
        loyalty_program_id: 1,
        level: 1,
        min_points: 100,
        multiplier: 1,
      };
      const merchant_id = 1;
      const loyaltyProgram = { id: 1, merchantId: merchant_id, is_active: true };
      const inactiveLoyaltyTier = { id: 1, ...createLoyaltyTierDto, is_active: false };
      const reactivatedLoyaltyTier = { ...inactiveLoyaltyTier, is_active: true };

      mockLoyaltyProgramRepo.findOneBy.mockResolvedValue(loyaltyProgram);
      mockLoyaltyTierRepo.findOneBy.mockResolvedValue(null);
      mockLoyaltyTierRepo.findOne.mockResolvedValue(inactiveLoyaltyTier);
      mockLoyaltyTierRepo.save.mockResolvedValue(reactivatedLoyaltyTier);

      const findOneSpy = jest.spyOn(service, 'findOne').mockResolvedValue(reactivatedLoyaltyTier as any);

      const result = await service.create(merchant_id, createLoyaltyTierDto);

      expect(mockLoyaltyTierRepo.findOne).toHaveBeenCalledWith({
        where: {
          name: createLoyaltyTierDto.name,
          loyalty_program_id: createLoyaltyTierDto.loyalty_program_id,
          is_active: false,
        },
      });
      expect(inactiveLoyaltyTier.is_active).toBe(true);
      expect(mockLoyaltyTierRepo.save).toHaveBeenCalledWith(inactiveLoyaltyTier);
      expect(findOneSpy).toHaveBeenCalledWith(inactiveLoyaltyTier.id, 'Created');
      expect(result).toEqual(reactivatedLoyaltyTier);
    });

    it('should throw an error if loyalty program not found', async () => {
        const createLoyaltyTierDto: CreateLoyaltyTierDto = {
            name: 'Gold',
            loyalty_program_id: 1,
            level: 1,
            min_points: 100,
            multiplier: 1,
          };
      const merchant_id = 1;

      mockLoyaltyProgramRepo.findOneBy.mockResolvedValue(null);
      jest.spyOn(ErrorHandler, 'notFound').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND);
      });

      await expect(service.create(merchant_id, createLoyaltyTierDto)).rejects.toThrow(
        ErrorMessage.LOYALTY_PROGRAM_NOT_FOUND,
      );
    });

    it('should throw an error if loyalty tier name exists', async () => {
        const createLoyaltyTierDto: CreateLoyaltyTierDto = {
            name: 'Gold',
            loyalty_program_id: 1,
            level: 1,
            min_points: 100,
            multiplier: 1,
          };
      const merchant_id = 1;
      const loyaltyProgram = { id: 1, merchantId: merchant_id, is_active: true };
      const existingLoyaltyTier = { id: 1, ...createLoyaltyTierDto, is_active: true };

      mockLoyaltyProgramRepo.findOneBy.mockResolvedValue(loyaltyProgram);
      mockLoyaltyTierRepo.findOneBy.mockResolvedValue(existingLoyaltyTier);
      jest.spyOn(ErrorHandler, 'exists').mockImplementation(() => {
        throw new Error(ErrorMessage.LOYALTY_TIER_NAME_EXISTS);
      });

      await expect(service.create(merchant_id, createLoyaltyTierDto)).rejects.toThrow(
        ErrorMessage.LOYALTY_TIER_NAME_EXISTS,
      );
    });
  });
});
