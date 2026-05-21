import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { CashShiftsService } from './cash-shifts.service';
import { CashShift } from './entities/cash-shift.entity';
import { CashShiftStatus } from './constants/cash-shift-status.enum';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { CashDrawerStatus } from '../cash-drawers/constants/cash-drawer-status.enum';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CashShiftRepository } from './cash-shift.repository';
import { CashFlowService } from './cash-flow.service';
import { CreateCashShiftDto } from './dto/create-cash-shift.dto';
import { CloseCashShiftDto } from './dto/close-cash-shift.dto';
import { ManualCashTransactionDto } from './dto/manual-cash-transaction.dto';
import { CashShiftMovementType } from './constants/cash-shift-movement-type.enum';
import { AuthenticatedUser } from '../../../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../../../platform-saas/users/constants/role.enum';
import { Scope } from '../../../platform-saas/users/constants/scope.enum';

describe('CashShiftsService', () => {
    let service: CashShiftsService;
    let cashDrawerRepo: Repository<CashDrawer>;
    let collaboratorRepo: Repository<Collaborator>;
    let cashShiftRepo: CashShiftRepository;
    let cashFlowService: CashFlowService;

    const mockCashDrawerRepository = {
        findOne: jest.fn(),
    };

    const mockMerchantRepository = {
        findOne: jest.fn(),
    };

    const mockCollaboratorRepository = {
        findOne: jest.fn(),
    };

    const mockCashShiftRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        getLiveBalance: jest.fn(),
        getSalesSummary: jest.fn(),
    };

    const mockCashFlowService = {
        addMovement: jest.fn(),
    };

    const mockEntityManager = {
        findOne: jest.fn(),
        query: jest.fn(),
        getRepository: jest.fn().mockReturnThis(),
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: mockEntityManager,
    };

    const mockDataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CashShiftsService,
                {
                    provide: getRepositoryToken(CashDrawer),
                    useValue: mockCashDrawerRepository,
                },
                {
                    provide: getRepositoryToken(Merchant),
                    useValue: mockMerchantRepository,
                },
                {
                    provide: getRepositoryToken(Collaborator),
                    useValue: mockCollaboratorRepository,
                },
                {
                    provide: CashShiftRepository,
                    useValue: mockCashShiftRepository,
                },
                {
                    provide: CashFlowService,
                    useValue: mockCashFlowService,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        service = module.get<CashShiftsService>(CashShiftsService);
        cashDrawerRepo = module.get<Repository<CashDrawer>>(getRepositoryToken(CashDrawer));
        collaboratorRepo = module.get<Repository<Collaborator>>(getRepositoryToken(Collaborator));
        cashShiftRepo = module.get<CashShiftRepository>(CashShiftRepository);
        cashFlowService = module.get<CashFlowService>(CashFlowService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('openShift', () => {
        const createDto: CreateCashShiftDto = {
            cashDrawerId: 1,
            collaboratorId: 5,
            openingBalance: 100,
        };

        it('should open a shift successfully', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue(null); // No active shift
            jest.spyOn(cashDrawerRepo, 'findOne').mockResolvedValue({ id: 1, merchant_id: 10, status: CashDrawerStatus.OPEN } as any);
            jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue({ id: 5, merchant_id: 10 } as any);
            jest.spyOn(cashShiftRepo, 'create').mockReturnValue({ id: 99, ...createDto, status: CashShiftStatus.OPEN } as any);
            jest.spyOn(cashShiftRepo, 'save').mockResolvedValue({ id: 99, ...createDto, status: CashShiftStatus.OPEN, openedBy: 5, merchantId: 10 } as any);

            const result = await service.openShift(createDto, 10);

            expect(result.statusCode).toBe(201);
            expect(result.message).toBe('Cash shift opened successfully');
            expect(result.data.id).toBe(99);
            expect(result.data.status).toBe(CashShiftStatus.OPEN);
        });

        it('should throw ConflictException if collaborator already has an open shift', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValueOnce({ id: 98, status: CashShiftStatus.OPEN } as any);

            await expect(service.openShift(createDto, 10)).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException if cash drawer already has an open shift', async () => {
            jest.spyOn(cashShiftRepo, 'findOne')
                .mockResolvedValueOnce(null) // collaborator check
                .mockResolvedValueOnce({ id: 98, status: CashShiftStatus.OPEN } as any); // drawer check

            await expect(service.openShift(createDto, 10)).rejects.toThrow(ConflictException);
        });
    });

    describe('closeShift', () => {
        const closeDto: CloseCashShiftDto = {
            declaredAmount: 150,
            collaboratorId: 5,
        };

        const activeUser: AuthenticatedUser = {
            id: 1,
            email: 'cashier@test.com',
            role: UserRole.MERCHANT_USER,
            scope: Scope.MERCHANT_WEB,
            merchant: { id: 10 },
        };

        const activeShift = {
            id: 99,
            merchantId: 10,
            cashDrawerId: 1,
            openedBy: 5,
            openingBalance: 100,
            status: CashShiftStatus.OPEN,
            openedAt: new Date(),
        };

        it('should close a shift successfully and calculate discrepancy (difference)', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue({ ...activeShift } as any);
            jest.spyOn(collaboratorRepo, 'findOne')
                .mockResolvedValueOnce({ id: 5, user_id: 1, merchant_id: 10 } as any) // check for MERCHANT_USER self check
                .mockResolvedValueOnce({ id: 5, user_id: 1, merchant_id: 10 } as any); // check for closing collaborator
            jest.spyOn(cashShiftRepo, 'getLiveBalance').mockResolvedValue(120); // 100 opening + 20 sales
            jest.spyOn(cashShiftRepo, 'save').mockImplementation(async (s) => s as any);
            jest.spyOn(cashShiftRepo, 'getSalesSummary').mockResolvedValue([{ method: 'Cash', amount: 20 }]);

            const result = await service.closeShift(99, closeDto, activeUser);

            expect(result.statusCode).toBe(200);
            expect(result.data.systemAmount).toBe(120);
            expect(result.data.declaredAmount).toBe(150);
            expect(result.data.difference).toBe(30); // 150 declared - 120 system = 30 overage
            expect(result.data.status).toBe(CashShiftStatus.CLOSED);
            expect(result.data.salesSummary).toEqual([{ method: 'Cash', amount: 20 }]);
        });

        it('should throw ForbiddenException if MERCHANT_USER tries to close other collaborator shift', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue({ ...activeShift, openedBy: 8 } as any); // Opened by collaborator 8
            jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue({ id: 5, user_id: 1, merchant_id: 10 } as any); // Current user is collaborator 5

            await expect(service.closeShift(99, closeDto, activeUser)).rejects.toThrow(ForbiddenException);
        });

        it('should allow MERCHANT_ADMIN to close other collaborator shift', async () => {
            const adminUser = { ...activeUser, role: UserRole.MERCHANT_ADMIN };
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue({ ...activeShift, openedBy: 8 } as any); // Opened by 8
            jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue({ id: 5, merchant_id: 10 } as any); // Closing collaborator is 5
            jest.spyOn(cashShiftRepo, 'getLiveBalance').mockResolvedValue(100);
            jest.spyOn(cashShiftRepo, 'save').mockImplementation(async (s) => s as any);
            jest.spyOn(cashShiftRepo, 'getSalesSummary').mockResolvedValue([]);

            const result = await service.closeShift(99, closeDto, adminUser);

            expect(result.statusCode).toBe(200);
            expect(result.data.status).toBe(CashShiftStatus.CLOSED);
            expect(result.data.closedBy).toBe(5);
        });
    });

    describe('addManualTransaction', () => {
        const manualDto: ManualCashTransactionDto = {
            amount: 50,
            type: CashShiftMovementType.OUT,
            collaboratorId: 5,
            reason: 'Payment to supplier',
        };

        const activeShift = {
            id: 99,
            merchantId: 10,
            cashDrawerId: 1,
            openedBy: 5,
            openingBalance: 100,
            status: CashShiftStatus.OPEN,
        };

        it('should register an OUT flow successfully if balance is sufficient', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue(activeShift as any);
            jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue({ id: 5, merchant_id: 10 } as any);

            // Mock transactional queryRunner behaviour
            mockEntityManager.findOne.mockResolvedValue(activeShift);
            mockEntityManager.query.mockResolvedValue([{ balance: '120' }]); // live balance is 120
            jest.spyOn(cashFlowService, 'addMovement').mockResolvedValue({ id: 1, amount: 50, type: 'withdrawal' } as any);

            const result = await service.addManualTransaction(99, manualDto, 10);

            expect(result.statusCode).toBe(201);
            expect(result.message).toBe('Manual transaction registered successfully');
            expect(result.data.amount).toBe(50);
            expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
        });

        it('should throw BadRequestException for OUT flow if balance is insufficient (CAT 1)', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue(activeShift as any);
            jest.spyOn(collaboratorRepo, 'findOne').mockResolvedValue({ id: 5, merchant_id: 10 } as any);

            mockEntityManager.findOne.mockResolvedValue(activeShift);
            mockEntityManager.query.mockResolvedValue([{ balance: '30' }]); // live balance is 30, trying to withdraw 50

            await expect(service.addManualTransaction(99, manualDto, 10)).rejects.toThrow(BadRequestException);
            expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
        });

        it('should throw BadRequestException if trying to write on a CLOSED shift', async () => {
            jest.spyOn(cashShiftRepo, 'findOne').mockResolvedValue({ ...activeShift, status: CashShiftStatus.CLOSED } as any);

            await expect(service.addManualTransaction(99, manualDto, 10)).rejects.toThrow(BadRequestException);
        });
    });
});
