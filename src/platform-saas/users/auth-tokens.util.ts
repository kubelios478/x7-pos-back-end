//src/platform-saas/users/auth-tokens.util.ts
//
// Reset and refresh tokens are credentials: the database keeps only their SHA-256, so a leak
// of the users table does not hand out live sessions or password resets.
import { createHash, randomBytes } from 'crypto';

/** How long a password-reset link works. */
export const PASSWORD_RESET_TTL_MINUTES = 30;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * A single-use reset token `<expiresAtUnix>.<random>`. The expiry travels in the token and the
 * stored hash covers the whole string, so changing it breaks the lookup.
 */
export function createPasswordResetToken(now: Date = new Date()): {
  token: string;
  hash: string;
} {
  const expiresAt =
    Math.floor(now.getTime() / 1000) + PASSWORD_RESET_TTL_MINUTES * 60;
  const token = `${expiresAt}.${randomBytes(32).toString('hex')}`;
  return { token, hash: hashToken(token) };
}

/** False for malformed or expired reset tokens (the database is not consulted). */
export function isPasswordResetTokenLive(
  token: string,
  now: Date = new Date(),
): boolean {
  const match = /^(\d{10})\.[0-9a-f]{64}$/.exec(token ?? '');
  return !!match && Number(match[1]) >= now.getTime() / 1000;
}
