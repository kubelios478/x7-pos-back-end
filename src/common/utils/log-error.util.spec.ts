import { errorMessage, errorStack } from './log-error.util';

describe('log-error util', () => {
  it('takes the message and stack of an Error', () => {
    const err = new Error('boom');
    expect(errorMessage(err)).toBe('boom');
    expect(errorStack(err)).toBe(err.stack);
  });

  it('stringifies anything else and has no stack for it', () => {
    expect(errorMessage('plain text')).toBe('plain text');
    expect(errorMessage(42)).toBe('42');
    expect(errorStack({ code: 'X' })).toBeUndefined();
  });
});
