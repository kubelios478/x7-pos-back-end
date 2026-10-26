import { isDevelopmentEnv, validateEnv } from './environment';

const LONG_SECRET = 'a'.repeat(32);
const OTHER_LONG_SECRET = 'b'.repeat(32);

const base = {
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_NAME: 'x7',
  JWT_SECRET: 'dev-secret',
  JWT_REFRESH_SECRET: 'dev-refresh-secret',
};

const production = {
  ...base,
  NODE_ENV: 'production',
  JWT_SECRET: LONG_SECRET,
  JWT_REFRESH_SECRET: OTHER_LONG_SECRET,
  CORS_ORIGINS: 'https://backoffice.example.com',
  FRONTEND_URL: 'https://backoffice.example.com',
};

describe('isDevelopmentEnv', () => {
  it.each(['development', 'test'])('is true for %s', (env) => {
    expect(isDevelopmentEnv(env)).toBe(true);
  });

  it.each(['', 'production', 'prod', 'Development'])(
    'is false for %p',
    (env) => {
      expect(isDevelopmentEnv(env)).toBe(false);
    },
  );

  it('reads process.env.NODE_ENV and is false when it is unset', () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'development';
      expect(isDevelopmentEnv()).toBe(true);
      delete process.env.NODE_ENV;
      expect(isDevelopmentEnv()).toBe(false);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

describe('validateEnv', () => {
  it('accepts a development configuration with short secrets', () => {
    expect(validateEnv(base)).toBe(base);
  });

  it('accepts a complete production configuration', () => {
    expect(validateEnv(production)).toBe(production);
  });

  it('rejects a missing or unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: undefined })).toThrow(
      'NODE_ENV must be one of development, test, production (got nothing)',
    );
    expect(() => validateEnv({ ...base, NODE_ENV: 'prod' })).toThrow(
      "(got 'prod')",
    );
  });

  it('requires the database and JWT settings in every environment', () => {
    expect(() =>
      validateEnv({ ...base, DB_HOST: '', JWT_SECRET: '  ' }),
    ).toThrow(/DB_HOST is required\n- JWT_SECRET is required/);
  });

  it('lists every error in one message', () => {
    expect(() => validateEnv({})).toThrow(
      [
        'Invalid environment configuration:',
        '- NODE_ENV must be one of development, test, production (got nothing)',
        '- DB_HOST is required',
        '- DB_USERNAME is required',
        '- DB_NAME is required',
        '- JWT_SECRET is required',
        '- JWT_REFRESH_SECRET is required',
      ].join('\n'),
    );
  });

  describe('in production', () => {
    it('rejects short secrets', () => {
      expect(() => validateEnv({ ...production, JWT_SECRET: 'short' })).toThrow(
        'JWT_SECRET must be at least 32 characters in production',
      );
    });

    it('rejects the .env.example secrets', () => {
      expect(() =>
        validateEnv({
          ...production,
          JWT_REFRESH_SECRET: 'cambia_esto_por_otro_secreto_largo',
        }),
      ).toThrow('JWT_REFRESH_SECRET still has the .env.example value');
    });

    it('rejects the same secret for access and refresh tokens', () => {
      expect(() =>
        validateEnv({ ...production, JWT_REFRESH_SECRET: LONG_SECRET }),
      ).toThrow('JWT_REFRESH_SECRET must differ from JWT_SECRET');
    });

    it('checks CONTRACT_DOCUMENT_SECRET only when it is set', () => {
      expect(() =>
        validateEnv({ ...production, CONTRACT_DOCUMENT_SECRET: 'short' }),
      ).toThrow('CONTRACT_DOCUMENT_SECRET must be at least 32 characters');
      expect(() =>
        validateEnv({ ...production, CONTRACT_DOCUMENT_SECRET: '' }),
      ).not.toThrow();
    });

    it('requires CORS_ORIGINS', () => {
      expect(() => validateEnv({ ...production, CORS_ORIGINS: '' })).toThrow(
        'CORS_ORIGINS is required in production',
      );
    });

    it.each([undefined, '', 'backoffice.example.com', 'ftp://example.com'])(
      'rejects FRONTEND_URL %p',
      (url) => {
        expect(() => validateEnv({ ...production, FRONTEND_URL: url })).toThrow(
          'FRONTEND_URL must be an http(s) URL in production',
        );
      },
    );
  });
});
