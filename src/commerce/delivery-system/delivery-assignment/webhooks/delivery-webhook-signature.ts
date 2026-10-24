//src/commerce/delivery-system/delivery-assignment/webhooks/delivery-webhook-signature.ts
//
// LIMITACIÓN: DoorDash y Uber firman sus webhooks con formatos de cabecera propios (y
// distintos entre sí). Como aún no hay contrato con ninguno, los dos usan por ahora el
// formato GENÉRICO de `webhook-signature.util` (x-signature: sha256=<hex HMAC-SHA256>).
// Cada proveedor tiene su propia función `verify`, así que el formato real se enchufa
// cambiando sólo esa función.
import {
  SignatureVerifier,
  verifyGenericHmacSha256,
} from 'src/common/utils/webhook-signature.util';
import { AssignmentType } from '../constants/assignment-type.enum';

export {
  GENERIC_SIGNATURE_HEADER,
  verifyGenericHmacSha256,
} from 'src/common/utils/webhook-signature.util';
export type {
  SignatureVerifier,
  WebhookHeaders,
} from 'src/common/utils/webhook-signature.util';

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
