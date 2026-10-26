import {
  PASSWORD_RESET_TTL_MINUTES,
  createPasswordResetToken,
  hashToken,
  isPasswordResetTokenLive,
} from './auth-tokens.util';

describe('auth tokens', () => {
  const now = new Date('2026-10-24T15:00:00Z');

  it('stores a hash, not the token', () => {
    const { token, hash } = createPasswordResetToken(now);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token.split('.')[1]);
  });

  it(`keeps a reset link alive for ${PASSWORD_RESET_TTL_MINUTES} minutes`, () => {
    const { token } = createPasswordResetToken(now);
    const justBefore = new Date(
      now.getTime() + (PASSWORD_RESET_TTL_MINUTES * 60 - 1) * 1000,
    );
    const after = new Date(
      now.getTime() + (PASSWORD_RESET_TTL_MINUTES * 60 + 1) * 1000,
    );
    expect(isPasswordResetTokenLive(token, justBefore)).toBe(true);
    expect(isPasswordResetTokenLive(token, after)).toBe(false);
  });

  it('a pushed-back expiry no longer matches the stored hash', () => {
    const { token, hash } = createPasswordResetToken(now);
    const [expires, random] = token.split('.');
    const forged = `${Number(expires) + 86400}.${random}`;
    expect(hashToken(forged)).not.toBe(hash);
  });

  it.each(['uuid-like-0000', '', '123.abc'])(
    'rejects a malformed token (%s)',
    (token) => {
      expect(isPasswordResetTokenLive(token, now)).toBe(false);
    },
  );
});
