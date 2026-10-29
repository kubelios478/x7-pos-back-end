//src/common/security/http-security.ts
//
// HTTP hardening shared by main.ts: client IP behind a proxy, security headers and CORS.
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { TOTAL_COUNT_HEADER } from '../utils/pagination.util';

/** `a.com, b.com` -> ['a.com', 'b.com']; empty or unset -> null (no list configured). */
export function parseCorsOrigins(raw: string | undefined): string[] | null {
  const origins = (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length ? origins : null;
}

/**
 * How many proxy hops to trust for the client IP (rate limits key on it). Behind Railway's
 * proxy every request would otherwise share the proxy's IP. TRUST_PROXY wins; by default
 * one hop in production and none locally, where X-Forwarded-For could be forged.
 */
export function trustProxySetting(
  raw: string | undefined,
  nodeEnv: string | undefined,
): number | boolean {
  if (raw === undefined || raw.trim() === '')
    return nodeEnv === 'production' ? 1 : false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : false;
}

export function configureHttpSecurity(
  app: NestExpressApplication,
  logger: Logger,
): void {
  app.set(
    'trust proxy',
    trustProxySetting(process.env.TRUST_PROXY, process.env.NODE_ENV),
  );

  // A JSON API: no CSP to tune. No X-Frame-Options either, since the backoffice embeds
  // contract documents served by this API in an <iframe>.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // X-Total-Count: el total de los listados sin envoltorio cuando se paginan.
  const exposedHeaders = [TOTAL_COUNT_HEADER];
  const origins = parseCorsOrigins(process.env.CORS_ORIGINS);
  if (origins) {
    app.enableCors({ origin: origins, exposedHeaders });
  } else {
    logger.warn(
      'CORS_ORIGINS is not set: browsers on any origin may call this API. Set it to the comma-separated frontend origins.',
    );
    app.enableCors({ exposedHeaders });
  }
}
