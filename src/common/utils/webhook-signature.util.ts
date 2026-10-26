//src/common/utils/webhook-signature.util.ts
//
// Formato GENÉRICO de firma para webhooks entrantes mientras no haya contrato con un
// proveedor concreto:
//   x-signature: sha256=<hex HMAC-SHA256 del cuerpo crudo con el secreto compartido>
// Se verifica sobre el cuerpo CRUDO (requiere `rawBody: true` en main.ts). Cuando se
// integre un proveedor real, su formato se enchufa con otra función `SignatureVerifier`.
import { createHmac, timingSafeEqual } from 'crypto';

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
