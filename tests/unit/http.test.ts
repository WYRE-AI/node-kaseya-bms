/**
 * HTTP layer integration tests.
 */

import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';
import { envelope, BASE } from '../mocks/handlers.js';
import { normalizePath, buildQueryString } from '../../src/http.js';
import { KaseyaBmsClient } from '../../src/client.js';
import {
  KaseyaBmsApplicationError,
  KaseyaBmsValidationError,
} from '../../src/errors.js';

describe('normalizePath', () => {
  it('adds a leading slash when missing', () => {
    expect(normalizePath('foo')).toBe('/foo');
    expect(normalizePath('/foo')).toBe('/foo');
  });
});

describe('buildQueryString', () => {
  it('returns empty string for nothing', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('omits undefined params', () => {
    expect(buildQueryString({ a: 1, b: undefined })).toBe('?a=1');
  });

  it('encodes OData $-prefixed params correctly', () => {
    const out = buildQueryString({ $top: 50, $filter: "Status eq 'Open'" });
    expect(out).toContain('%24top=50');
    expect(out).toContain('%24filter=');
  });
});

describe('HTTP wire behavior', () => {
  function makeClient(): KaseyaBmsClient {
    return new KaseyaBmsClient({
      tenant: 'my-tenant',
      apiToken: 'tok',
      rateLimit: { maxRetries: 0, retryAfterMs: 1, throttleThreshold: 1.1 },
    });
  }

  it('unwraps the BMS envelope and returns Result', async () => {
    const c = makeClient();
    const list = await c.tickets.list({ top: 100 });
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]?.TicketNumber).toBe('T-001');
  });

  it('maps non-zero ResponseCode (HTTP 200) to KaseyaBmsApplicationError', async () => {
    const c = makeClient();
    await expect(c.tickets.get('APPERR')).rejects.toBeInstanceOf(KaseyaBmsApplicationError);
  });

  it('maps 400 with ModelState to KaseyaBmsValidationError surfacing field errors', async () => {
    const c = makeClient();
    const err = await c.tickets.get('BADFILTER').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KaseyaBmsValidationError);
    expect((err as KaseyaBmsValidationError).fieldErrors.$filter).toEqual([
      'Field name must be PascalCase',
    ]);
  });

  it('retries 401 once with auth.refresh and gives up on the second 401', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v2/service/tickets/AUTH401`, () => {
        calls += 1;
        return HttpResponse.json({ Error: 'expired' }, { status: 401 });
      })
    );
    const c = makeClient();
    await expect(c.tickets.get('AUTH401')).rejects.toThrow();
    // executeRequest retries once after invalidating, so we expect 2 calls.
    expect(calls).toBe(2);
  });
});
