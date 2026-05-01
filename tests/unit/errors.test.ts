import { describe, it, expect } from 'vitest';
import {
  KaseyaBmsError,
  KaseyaBmsAuthenticationError,
  KaseyaBmsApplicationError,
  KaseyaBmsForbiddenError,
  KaseyaBmsNotFoundError,
  KaseyaBmsRateLimitError,
  KaseyaBmsServerError,
  KaseyaBmsValidationError,
  extractFieldErrors,
} from '../../src/errors.js';

describe('errors', () => {
  it('all errors extend KaseyaBmsError and Error', () => {
    const cases = [
      new KaseyaBmsError('a'),
      new KaseyaBmsAuthenticationError('a'),
      new KaseyaBmsApplicationError('a', 1001),
      new KaseyaBmsForbiddenError('a'),
      new KaseyaBmsNotFoundError('a'),
      new KaseyaBmsRateLimitError('a'),
      new KaseyaBmsServerError('a'),
      new KaseyaBmsValidationError('a'),
    ];
    for (const e of cases) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(KaseyaBmsError);
    }
  });

  it('application error preserves the response code', () => {
    const e = new KaseyaBmsApplicationError('boom', 1001);
    expect(e.responseCode).toBe(1001);
    expect(e.statusCode).toBe(200);
  });

  it('rate limit error preserves retryAfter', () => {
    const e = new KaseyaBmsRateLimitError('slow', 7000);
    expect(e.retryAfter).toBe(7000);
    expect(e.statusCode).toBe(429);
  });

  it('validation error preserves field errors', () => {
    const e = new KaseyaBmsValidationError('bad', { Subject: ['required'] });
    expect(e.fieldErrors.Subject).toEqual(['required']);
    expect(e.statusCode).toBe(400);
  });
});

describe('extractFieldErrors', () => {
  it('returns empty object on non-object input', () => {
    expect(extractFieldErrors(null)).toEqual({});
    expect(extractFieldErrors('boom')).toEqual({});
  });

  it('extracts ModelState shape', () => {
    expect(extractFieldErrors({ ModelState: { Subject: ['required'] } })).toEqual({
      Subject: ['required'],
    });
  });

  it('extracts errors shape', () => {
    expect(extractFieldErrors({ errors: { Foo: 'bad' } })).toEqual({ Foo: ['bad'] });
  });
});
