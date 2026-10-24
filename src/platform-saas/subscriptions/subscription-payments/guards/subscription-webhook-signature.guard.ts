//src/platform-saas/subscriptions/subscription-payments/guards/subscription-webhook-signature.guard.ts
//
// POST /subscription-payments/webhook es público (sin JWT): la firma HMAC es su única
// autenticación. Va en un guard para que se compruebe ANTES de validar el body o tocar
// la base. Mientras no se integre una pasarela real se usa el formato genérico de
// `webhook-signature.util` con el secreto SUBSCRIPTION_WEBHOOK_SECRET.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verifyGenericHmacSha256 } from 'src/common/utils/webhook-signature.util';

export const SUBSCRIPTION_WEBHOOK_SECRET_ENV = 'SUBSCRIPTION_WEBHOOK_SECRET';

@Injectable()
export class SubscriptionWebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionWebhookSignatureGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Sin secreto no hay forma de autenticar: se rechaza, nunca se acepta "por defecto".
    const secret = this.config.get<string>(SUBSCRIPTION_WEBHOOK_SECRET_ENV);
    if (!secret) {
      this.logger.error(
        `${SUBSCRIPTION_WEBHOOK_SECRET_ENV} is not set; rejecting subscription payment webhook`,
      );
      throw new ServiceUnavailableException(
        'Subscription payment webhook is not configured',
      );
    }

    const req = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    if (
      !req.rawBody ||
      !verifyGenericHmacSha256(req.rawBody, req.headers, secret)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return true;
  }
}
