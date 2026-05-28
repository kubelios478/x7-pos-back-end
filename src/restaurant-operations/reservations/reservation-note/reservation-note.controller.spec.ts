import { Test, TestingModule } from '@nestjs/testing';
import { ReservationNoteController } from './reservation-note.controller';
import { ReservationNoteService } from './reservation-note.service';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';

describe('ReservationNoteController', () => {
  let controller: ReservationNoteController;
  let service: ReservationNoteService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllGlobal: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUser = {
    id: 1,
    merchant: { id: 1 },
    role: UserRole.MERCHANT_ADMIN,
    scope: Scope.MERCHANT_WEB,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationNoteController],
      providers: [
        {
          provide: ReservationNoteService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ReservationNoteController>(
      ReservationNoteController,
    );
    service = module.get<ReservationNoteService>(ReservationNoteService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const dto = { reservation_id: 1, note: 'Test' };
      await controller.create(mockUser as any, dto);
      expect(service.create).toHaveBeenCalledWith({ ...dto, created_by: 1 }, 1);
    });
  });

  describe('findAllGlobal', () => {
    it('should call service.findAllGlobal', async () => {
      const query = { page: 1, limit: 10 };
      await controller.findAllGlobal(mockUser as any, query);
      expect(service.findAllGlobal).toHaveBeenCalledWith(1, query);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      await controller.findAll(mockUser as any, 1, 1, 10);
      expect(service.findAll).toHaveBeenCalledWith(1, 1, 1, 10);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      await controller.findOne(mockUser as any, 1);
      expect(service.findOne).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { note: 'Updated' };
      await controller.update(mockUser as any, 1, dto);
      expect(service.update).toHaveBeenCalledWith(1, dto, 1);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      await controller.remove(mockUser as any, 1);
      expect(service.remove).toHaveBeenCalledWith(1, 1);
    });
  });
});
