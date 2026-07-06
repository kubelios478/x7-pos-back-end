import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mail.service';
import { RealtimeEventBusService } from 'src/realtime/realtime-event-bus.service';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { InventoryStockAlert } from './entities/inventory-stock-alert.entity';
import { InventoryStockAlertType } from './constants/inventory-stock-alert-type.enum';
import {
  INVENTORY_STOCK_ALERT_EVENT,
  type InventoryStockAlertPayload,
} from './inventory-stock.events';
import { InventoryStockAlertListener } from './inventory-stock-alert.listener';

async function flushDeferredWork(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

type SendMailOptions = Parameters<MailService['sendMail']>[0];

describe('InventoryStockAlertListener', () => {
  let listener: InventoryStockAlertListener;
  let realtimeBus: { emitToRoom: jest.Mock };
  let mailService: {
    sendMail: jest.Mock<Promise<void>, [SendMailOptions]>;
  };
  let alertRepo: {
    findOne: jest.Mock;
    update: jest.Mock<Promise<void>, [{ id: number }, { emailSentAt: Date }]>;
  };
  let merchantRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock; find: jest.Mock };

  const payload: InventoryStockAlertPayload = {
    companyId: 1,
    merchantId: 10,
    alertId: 99,
    stockItemId: 5,
    productId: 20,
    variantId: 30,
    categoryId: 40,
    locationId: 50,
    alertType: InventoryStockAlertType.LOW,
    currentQty: 8,
    minimumQty: 10,
    productName: 'Flour',
    variantName: 'Default',
    locationName: 'Main',
  };

  beforeEach(async () => {
    realtimeBus = { emitToRoom: jest.fn() };
    mailService = {
      sendMail: jest
        .fn<Promise<void>, [SendMailOptions]>()
        .mockResolvedValue(undefined),
    };
    alertRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: payload.alertId,
        emailSentAt: null,
      }),
      update: jest
        .fn<Promise<void>, [{ id: number }, { emailSentAt: Date }]>()
        .mockResolvedValue(undefined),
    };
    merchantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: payload.merchantId,
        email: 'merchant@example.com',
      }),
    };
    userRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryStockAlertListener,
        { provide: RealtimeEventBusService, useValue: realtimeBus },
        { provide: MailService, useValue: mailService },
        {
          provide: getRepositoryToken(InventoryStockAlert),
          useValue: alertRepo,
        },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    listener = module.get(InventoryStockAlertListener);
  });

  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.WS_ENABLED;
  });

  it('emits realtime event to company room when WS is enabled', async () => {
    process.env.WS_ENABLED = 'true';
    listener.handleInventoryStockAlert(payload);
    await flushDeferredWork();

    expect(realtimeBus.emitToRoom).toHaveBeenCalledWith(
      'company:1',
      INVENTORY_STOCK_ALERT_EVENT,
      payload,
    );
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('skips realtime when WS_ENABLED is false', async () => {
    process.env.WS_ENABLED = 'false';
    listener.handleInventoryStockAlert(payload);
    await flushDeferredWork();

    expect(realtimeBus.emitToRoom).not.toHaveBeenCalled();
  });

  it('sends email and marks emailSentAt when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    listener.handleInventoryStockAlert(payload);
    await flushDeferredWork();

    expect(mailService.sendMail).toHaveBeenCalledTimes(1);
    const mailArg = mailService.sendMail.mock.calls[0]?.[0];
    expect(mailArg?.to).toBe('merchant@example.com');
    expect(mailArg?.subject).toContain('Low stock');
    expect(alertRepo.update).toHaveBeenCalledTimes(1);
    const updateArg = alertRepo.update.mock.calls[0]?.[1] as
      | {
          emailSentAt: Date;
        }
      | undefined;
    expect(updateArg?.emailSentAt).toBeInstanceOf(Date);
  });

  it('does not send email when alert already has emailSentAt', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    alertRepo.findOne.mockResolvedValue({
      id: payload.alertId,
      emailSentAt: new Date(),
    });

    listener.handleInventoryStockAlert(payload);
    await flushDeferredWork();

    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(alertRepo.update).not.toHaveBeenCalled();
  });
});
