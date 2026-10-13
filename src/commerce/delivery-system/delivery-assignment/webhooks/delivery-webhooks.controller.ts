//src/commerce/delivery-system/delivery-assignment/webhooks/delivery-webhooks.controller.ts
//
// POST /api/webhooks/deliveries/:provider  (provider = doordash | uber)
// Endpoint PÚBLICO (sin JWT): la firma HMAC es la única autenticación. Se verifica sobre el
// cuerpo CRUDO (requiere `rawBody: true` en main.ts) antes de leer el JSON o tocar la base.
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DeliveryAssignmentService } from '../delivery-assignment.service';
import {
  GENERIC_SIGNATURE_HEADER,
  WEBHOOK_PROVIDERS,
  WebhookHeaders,
} from './delivery-webhook-signature';

@ApiTags('Commerce - Delivery System - Delivery Webhooks')
@Controller('webhooks/deliveries')
export class DeliveryWebhooksController {
  private readonly logger = new Logger(DeliveryWebhooksController.name);

  constructor(
    private readonly deliveryAssignmentService: DeliveryAssignmentService,
    private readonly config: ConfigService,
  ) {}

  @Post(':provider')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delivery status webhook from a DSP (public, HMAC-signed)',
    description:
      'Body: { "event": "dasher_assigned" | "picked_up" | "delivered", "external_delivery_id": "..." }. Signature: `x-signature: sha256=<hex HMAC-SHA256 of the raw body>` with DOORDASH_WEBHOOK_SECRET / UBER_WEBHOOK_SECRET (generic placeholder format until the real provider formats are implemented). Unknown deliveries, repeated or out-of-order events are acknowledged with 200 and ignored.',
  })
  @ApiParam({ name: 'provider', enum: Object.keys(WEBHOOK_PROVIDERS) })
  @ApiHeader({ name: GENERIC_SIGNATURE_HEADER, required: true })
  @ApiOkResponse({
    schema: {
      example: {
        statusCode: 200,
        message: 'Webhook processed',
        data: {
          outcome: 'applied',
          assignment_id: 1,
          delivery_status: 'picked_up',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid signature' })
  @ApiServiceUnavailableResponse({
    description: 'Webhook secret not configured for this provider',
  })
  async handle(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: WebhookHeaders,
  ) {
    const providerConfig = WEBHOOK_PROVIDERS[provider];
    if (!providerConfig) {
      throw new NotFoundException(`Unknown delivery provider '${provider}'`);
    }

    // Sin secreto no hay forma de autenticar: se rechaza, nunca se acepta "por defecto".
    const secret = this.config.get<string>(providerConfig.secretEnv);
    if (!secret) {
      this.logger.error(
        `${providerConfig.secretEnv} is not set; rejecting ${provider} webhook`,
      );
      throw new ServiceUnavailableException(
        'Webhook receiver not configured for this provider',
      );
    }

    const rawBody = req.rawBody;
    if (!rawBody || !providerConfig.verify(rawBody, headers, secret)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Sólo tras verificar la firma se interpreta el contenido.
    let payload: { event?: unknown; external_delivery_id?: unknown };
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
    } catch {
      throw new BadRequestException('Webhook body must be valid JSON');
    }
    if (
      typeof payload?.event !== 'string' ||
      typeof payload.external_delivery_id !== 'string' ||
      !payload.external_delivery_id
    ) {
      throw new BadRequestException(
        'Webhook body must include string fields "event" and "external_delivery_id"',
      );
    }

    const result = await this.deliveryAssignmentService.handleProviderEvent(
      providerConfig.assignmentType,
      {
        event: payload.event,
        external_delivery_id: payload.external_delivery_id,
      },
    );
    return { statusCode: 200, message: 'Webhook processed', data: result };
  }
}
