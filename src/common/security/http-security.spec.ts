import { parseCorsOrigins, trustProxySetting } from './http-security';

describe('http security settings', () => {
  it.each([
    [undefined, null],
    ['', null],
    [' https://a.com , https://b.com ', ['https://a.com', 'https://b.com']],
  ])('CORS_ORIGINS=%p -> %p', (raw, expected) => {
    expect(parseCorsOrigins(raw)).toEqual(expected);
  });

  it.each([
    [undefined, 'production', 1],
    [undefined, 'development', false],
    ['2', 'production', 2],
    ['false', 'production', false],
    ['true', undefined, true],
    ['nonsense', 'production', false],
  ])('TRUST_PROXY=%p with NODE_ENV=%p -> %p', (raw, env, expected) => {
    expect(trustProxySetting(raw, env)).toBe(expected);
  });
});
