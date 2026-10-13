//src/commerce/delivery-system/delivery-assignment/webhooks/delivery-webhooks.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { createHmac } from 'crypto';
import { DeliveryWebhooksController } from './delivery-webhooks.controller';
import { DeliveryAssignmentService } from '../delivery-assignment.service';
import { verifyGenericHmacSha256 } from './delivery-webhook-signature';
import { AssignmentType } from '../constants/assignment-type.enum';

const SECRET = 'whsec_test';

describe('DeliveryWebhooksController', () => {
  let controller: DeliveryWebhooksController;
  let service: { handleProviderEvent: jest.Mock };
  let env: Record<string, string | undefined>;

  const body = JSON.stringify({
    event: 'picked_up',
    external_delivery_id: 'dd-1',
  });
  const sign = (raw: string, secret = SECRET) =>
    `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
  const req = (raw: string | undefined) =>
    ({
      rawBody: raw === undefined ? undefined : Buffer.from(raw),
    }) as RawBodyRequest<Request>;

  beforeEach(async () => {
    env = { DOORDASH_WEBHOOK_SECRET: SECRET, UBER_WEBHOOK_SECRET: SECRET };
    service = {
      handleProviderEvent: jest.fn().mockResolvedValue({
        outcome: 'applied',
        assignment_id: 1,
        delivery_status: 'picked_up',
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryWebhooksController],
      providers: [
        { provide: DeliveryAssignmentService, useValue: service },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => env[k]) },
        },
      ],
    }).compile();
    controller = module.get(DeliveryWebhooksController);
  });

  it('a valid signature forwards the parsed event to the provider type', async () => {
    const res = await controller.handle('doordash', req(body), {
      'x-signature': sign(body),
    });
    expect(service.handleProviderEvent).toHaveBeenCalledWith(
      AssignmentType.DOORDASH_DRIVE,
      { event: 'picked_up', external_delivery_id: 'dd-1' },
    );
    expect(res).toEqual({
      statusCode: 200,
      message: 'Webhook processed',
      data: expect.objectContaining({ outcome: 'applied' }),
    });
  });

  it.each([
    ['missing', {}],
    ['wrong secret', { 'x-signature': sign(body, 'other') }],
    ['malformed', { 'x-signature': 'sha256=abc' }],
    ['no prefix', { 'x-signature': sign(body).replace('sha256=', '') }],
  ])('%s signature → 401 without touching the service', async (_l, headers) => {
    await expect(controller.handle('uber', req(body), headers)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(service.handleProviderEvent).not.toHaveBeenCalled();
  });

  it('a tampered body fails the signature', async () => {
    const tampered = body.replace('picked_up', 'delivered');
    await expect(
      controller.handle('doordash', req(tampered), {
        'x-signature': sign(body),
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('no raw body (rawBody disabled) → 401', async () => {
    await expect(
      controller.handle('doordash', req(undefined), {
        'x-signature': sign(body),
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('a missing secret is never accepted', async () => {
    env.DOORDASH_WEBHOOK_SECRET = undefined;
    await expect(
      controller.handle('doordash', req(body), { 'x-signature': sign(body) }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(service.handleProviderEvent).not.toHaveBeenCalled();
  });

  it('unknown provider → 404', async () => {
    await expect(
      controller.handle('glovo', req(body), { 'x-signature': sign(body) }),
    ).rejects.toThrow(NotFoundException);
  });

  it('verifier accepts a valid header and rejects non-string headers', () => {
    expect(
      verifyGenericHmacSha256(
        Buffer.from(body),
        { 'x-signature': sign(body) },
        SECRET,
      ),
    ).toBe(true);
    expect(
      verifyGenericHmacSha256(
        Buffer.from(body),
        { 'x-signature': ['a', 'b'] },
        SECRET,
      ),
    ).toBe(false);
  });
});
