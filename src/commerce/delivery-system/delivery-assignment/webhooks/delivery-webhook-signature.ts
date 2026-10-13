//src/commerce/delivery-system/delivery-assignment/webhooks/delivery-webhook-signature.ts
//
// LIMITACIÓN: DoorDash y Uber firman sus webhooks con formatos de cabecera propios (y
// distintos entre sí). Como aún no hay contrato con ninguno, los dos usan por ahora un
// formato GENÉRICO documentado:
//   x-signature: sha256=<hex HMAC-SHA256 del cuerpo crudo con el secreto del proveedor>
// Cada proveedor tiene su propia función `verify`, así que el formato real se enchufa
// cambiando sólo esa función.
import { createHmac, timingSafeEqual } from 'crypto';
import { AssignmentType } from '../constants/assignment-type.enum';

export type WebhookHeaders = Record<string, string | string[] | undefined>;
export type SignatureVerifier = (
  rawBody: Buffer,
  headers: WebhookHeaders,
  secret: string,
) => boolean;

export const GENERIC_SIGNATURE_HEADER = 'x-signature';

export const verifyGenericHmacSha256: SignatureVerifier = (
  rawBody,
  headers,
  secret,
) => {
  const header = headers[GENERIC_SIGNATURE_HEADER];
  if (typeof header !== 'string') return false;
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const provided = Buffer.from(match[1], 'hex');
  // timingSafeEqual lanza si las longitudes difieren: se comprueba antes.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
};

export interface WebhookProviderConfig {
  assignmentType: AssignmentType;
  secretEnv: string;
  verify: SignatureVerifier;
}

export const WEBHOOK_PROVIDERS: Record<string, WebhookProviderConfig> = {
  doordash: {
    assignmentType: AssignmentType.DOORDASH_DRIVE,
    secretEnv: 'DOORDASH_WEBHOOK_SECRET',
    verify: verifyGenericHmacSha256,
  },
  uber: {
    assignmentType: AssignmentType.UBER_DIRECT,
    secretEnv: 'UBER_WEBHOOK_SECRET',
    verify: verifyGenericHmacSha256,
  },
};
