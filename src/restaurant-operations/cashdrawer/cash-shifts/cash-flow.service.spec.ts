import { EntityManager } from 'typeorm';
import { CashFlowService } from './cash-flow.service';
import { CashShiftMovementType } from './constants/cash-shift-movement-type.enum';
import { CashTransaction } from '../cash-transactions/entities/cash-transaction.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { CashTransactionType } from '../cash-transactions/constants/cash-transaction-type.enum';

describe('CashFlowService', () => {
  const service = new CashFlowService();

  const transactionRepo = {
    create: jest.fn((data: Partial<CashTransaction>) => data),
    save: jest.fn((data: Partial<CashTransaction>) =>
      Promise.resolve({ id: 99, ...data }),
    ),
  };
  const drawerRepo = { increment: jest.fn(), decrement: jest.fn() };
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === CashDrawer ? drawerRepo : transactionRepo,
    ),
  } as unknown as EntityManager;

  afterEach(() => jest.clearAllMocks());

  it('records a cash sale and adds it to the drawer balance', async () => {
    const result = await service.addMovement(
      7,
      42.5,
      CashShiftMovementType.IN,
      2,
      3,
      5,
      manager,
    );

    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        shift_id: 7,
        cash_drawer_id: 5,
        order_id: 2,
        type: CashTransactionType.SALE,
        amount: 42.5,
      }),
    );
    expect(drawerRepo.increment).toHaveBeenCalledWith(
      { id: 5 },
      'current_balance',
      42.5,
    );
    expect(drawerRepo.decrement).not.toHaveBeenCalled();
    expect(result.id).toBe(99);
  });

  it('records a manual inflow as an adjustment, not a sale', async () => {
    await service.addMovement(
      7,
      20,
      CashShiftMovementType.IN,
      null,
      3,
      5,
      manager,
      'Change for the till',
    );

    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: null,
        type: CashTransactionType.ADJUSTMENT_UP,
      }),
    );
    expect(drawerRepo.increment).toHaveBeenCalledWith(
      { id: 5 },
      'current_balance',
      20,
    );
  });

  it('records a cash refund of an order as a refund', async () => {
    await service.addMovement(
      7,
      15,
      CashShiftMovementType.OUT,
      2,
      3,
      5,
      manager,
    );

    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: 2,
        type: CashTransactionType.REFUND,
      }),
    );
    expect(drawerRepo.decrement).toHaveBeenCalledWith(
      { id: 5 },
      'current_balance',
      15,
    );
  });

  it('records a manual outflow and subtracts it from the drawer balance', async () => {
    await service.addMovement(
      7,
      10,
      CashShiftMovementType.OUT,
      null,
      3,
      5,
      manager,
      'Change for the till',
    );

    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CashTransactionType.WITHDRAWAL,
        notes: 'Change for the till',
      }),
    );
    expect(drawerRepo.decrement).toHaveBeenCalledWith(
      { id: 5 },
      'current_balance',
      10,
    );
    expect(drawerRepo.increment).not.toHaveBeenCalled();
  });
});
