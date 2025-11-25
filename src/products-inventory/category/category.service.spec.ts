import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { Repository } from 'typeorm';
import { ProductsInventoryService } from '../products-inventory.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepo: jest.Mocked<Repository<Category>>;
  let merchantRepo: jest.Mocked<Repository<Merchant>>;
  let productsInventoryService: jest.Mocked<ProductsInventoryService>;
  type MockQueryBuilder = {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    getCount: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getMany: jest.Mock;
  };
  let mockQueryBuilder: MockQueryBuilder;

  const mockCategory: Partial<Category> = {
    id: 1,
    name: 'Test Category',
    merchantId: 1,
    parentId: undefined,
  };

  const mockQuery: GetCategoriesQueryDto = {
    page: 1,
    limit: 10,
    name: undefined,
  };

  const mockMerchant = {
    id: 1,
    name: 'Test Merchant',
  };

  beforeEach(async () => {
    const mockCategoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockCategoryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const mockMerchantRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    const mockProductsInventoryService = {
      findParentCategories: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
        {
          provide: getRepositoryToken(Merchant),
          useValue: mockMerchantRepo,
        },
        {
          provide: ProductsInventoryService,
          useValue: mockProductsInventoryService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryRepo = module.get(getRepositoryToken(Category));
    merchantRepo = module.get(getRepositoryToken(Merchant));
    productsInventoryService = module.get(ProductsInventoryService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all Categories successfully', async () => {
      const categories = [mockCategory as Category];
      mockQueryBuilder.getMany.mockResolvedValue(categories);
      mockQueryBuilder.getCount.mockResolvedValue(categories.length);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'category.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);

      expect(result).toEqual({
        statusCode: 200,
        message: 'Categories retrieved successfully',
        data: [
          {
            id: mockCategory.id,
            name: mockCategory.name,
            merchant: null,
          },
        ],
        page: mockQuery.page,
        limit: mockQuery.limit,
        total: categories.length,
        totalPages: Math.ceil(categories.length / mockQuery.limit!),
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return empty array when no categories found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockQueryBuilder.getCount.mockResolvedValue(0);

      const result = await service.findAll(mockQuery, mockMerchant.id);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'category.merchant',
        'merchant',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'category.merchantId = :merchantId',
        { merchantId: mockMerchant.id },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'category.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'category.name',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(mockQuery.limit);
      expect(result.data).toEqual([]);
      expect(result.statusCode).toBe(200);
      expect(result.message).toBe('Categories retrieved successfully');
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const mockParentCategoryResponse = {
      id: 2,
      parentName: 'Parent Category',
    };

    const mockChildCategory: Partial<Category> = {
      id: 3,
      name: 'Child Category',
      merchantId: 1,
      parentId: 2,
    };

    it('should return a category successfully when found', async () => {
      categoryRepo.findOne.mockResolvedValueOnce(mockCategory as Category);
      productsInventoryService.findParentCategories.mockResolvedValueOnce([]);

      const result = await service.findOne(mockCategory.id!, mockMerchant.id);

      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: mockCategory.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant'],
      });
      expect(
        productsInventoryService.findParentCategories,
      ).toHaveBeenCalledTimes(1); // Ahora se llama siempre
      expect(result).toEqual({
        statusCode: 200,
        message: 'Category retrieved successfully',
        data: {
          id: mockCategory.id,
          name: mockCategory.name,
          merchant: null,
          parents: [],
        },
      });
    });

    it('should return a category with parents when parentId exists', async () => {
      categoryRepo.findOne.mockResolvedValueOnce(mockChildCategory as Category);
      productsInventoryService.findParentCategories.mockResolvedValueOnce([
        mockParentCategoryResponse,
      ]);

      const result = await service.findOne(
        mockChildCategory.id!,
        mockMerchant.id,
      );

      expect(categoryRepo.findOne()).toHaveBeenCalledWith({
        where: {
          id: mockChildCategory.id,
          merchantId: mockMerchant.id,
          isActive: true,
        },
        relations: ['merchant'],
      });
      expect(
        productsInventoryService.findParentCategories(),
      ).toHaveBeenCalledWith(mockChildCategory.id);
      expect(result).toEqual({
        statusCode: 200,
        message: 'Category retrieved successfully',
        data: {
          id: mockChildCategory.id,
          name: mockChildCategory.name,
          merchant: null,
          parents: [mockParentCategoryResponse],
        },
      });
    });

    it('should throw NotFoundException if category is not found', async () => {
      categoryRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(1, mockMerchant.id)).rejects.toThrow(
        'Category not found',
      );
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, merchantId: mockMerchant.id, isActive: true },
        relations: ['merchant'],
      });
    });

    it('should throw BadRequestException if category ID is invalid', async () => {
      await expect(service.findOne(0, mockMerchant.id)).rejects.toThrow(
        'Category ID id incorrect',
      );
      expect(categoryRepo.findOne).not.toHaveBeenCalled();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
