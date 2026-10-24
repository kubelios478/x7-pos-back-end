import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { SubscriptionWebhookSignatureGuard } from './subscription-webhook-signature.guard';

describe('SubscriptionWebhookSignatureGuard', () => {
  const secret = 'whsec_test';
  const rawBody = Buffer.from(
    JSON.stringify({ paymentId: 1, status: 'paid', amount: 100 }),
  );
  const sign = (body: Buffer, key = secret) =>
    `sha256=${createHmac('sha256', key).update(body).digest('hex')}`;

  const guardWith = (value?: string) =>
    new SubscriptionWebhookSignatureGuard({
      get: jest.fn().mockReturnValue(value),
    } as unknown as ConfigService);

  const contextFor = (req: {
    rawBody?: Buffer;
    headers: Record<string, string>;
  }) =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  it('accepts a body signed with the configured secret', () => {
    const ctx = contextFor({
      rawBody,
      headers: { 'x-signature': sign(rawBody) },
    });
    expect(guardWith(secret).canActivate(ctx)).toBe(true);
  });

  it('rejects every call while the secret is not configured', () => {
    const ctx = contextFor({
      rawBody,
      headers: { 'x-signature': sign(rawBody) },
    });
    expect(() => guardWith(undefined).canActivate(ctx)).toThrow(
      ServiceUnavailableException,
    );
  });

  it.each([
    ['no signature', {}],
    ['a signature made with another secret', { 'x-signature': 'other' }],
    ['a malformed signature', { 'x-signature': 'sha256=zz' }],
  ])('rejects %s', (_label, headers: Record<string, string>) => {
    const signed =
      headers['x-signature'] === 'other'
        ? { 'x-signature': sign(rawBody, 'other') }
        : headers;
    const ctx = contextFor({ rawBody, headers: signed });
    expect(() => guardWith(secret).canActivate(ctx)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a body altered after signing', () => {
    const ctx = contextFor({
      rawBody: Buffer.from(rawBody.toString().replace('100', '1')),
      headers: { 'x-signature': sign(rawBody) },
    });
    expect(() => guardWith(secret).canActivate(ctx)).toThrow(
      UnauthorizedException,
    );
  });
});
