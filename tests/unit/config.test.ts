import { describe, it, expect } from 'vitest';
import {
  resolveConfig,
  normalizeBaseUrl,
  buildBaseUrlFromTenant,
  DEFAULT_RATE_LIMIT_CONFIG,
} from '../../src/config.js';

describe('normalizeBaseUrl', () => {
  it('appends /api when missing', () => {
    expect(normalizeBaseUrl('https://my-tenant.bms.kaseya.com')).toBe(
      'https://my-tenant.bms.kaseya.com/api'
    );
  });

  it('preserves /api when already present', () => {
    expect(normalizeBaseUrl('https://my-tenant.bms.kaseya.com/api')).toBe(
      'https://my-tenant.bms.kaseya.com/api'
    );
  });

  it('strips trailing slashes', () => {
    expect(normalizeBaseUrl('https://my-tenant.bms.kaseya.com/api/')).toBe(
      'https://my-tenant.bms.kaseya.com/api'
    );
  });
});

describe('buildBaseUrlFromTenant', () => {
  it('builds the canonical URL', () => {
    expect(buildBaseUrlFromTenant('my-tenant')).toBe('https://my-tenant.bms.kaseya.com/api');
  });
});

describe('resolveConfig', () => {
  it('requires either apiToken or kaseyaOneToken', () => {
    expect(() => resolveConfig({ tenant: 'x' })).toThrow();
  });

  it('rejects providing both apiToken and kaseyaOneToken', () => {
    expect(() =>
      resolveConfig({
        tenant: 'x',
        apiToken: 'a',
        kaseyaOneToken: 'b',
      })
    ).toThrow(/not both/i);
  });

  it('requires tenant when using apiToken', () => {
    expect(() => resolveConfig({ apiToken: 'a' })).toThrow(/tenant/i);
  });

  it('does not require tenant when using kaseyaOneToken (with explicit baseUrl)', () => {
    const r = resolveConfig({
      baseUrl: 'https://my-tenant.bms.kaseya.com',
      kaseyaOneToken: 'jwt',
    });
    expect(r.baseUrl).toBe('https://my-tenant.bms.kaseya.com/api');
    expect(r.tenant).toBeUndefined();
  });

  it('derives baseUrl from tenant when baseUrl omitted', () => {
    const r = resolveConfig({ tenant: 'my-tenant', apiToken: 'tok' });
    expect(r.baseUrl).toBe('https://my-tenant.bms.kaseya.com/api');
  });

  it('merges rate limit overrides with defaults', () => {
    const c = resolveConfig({
      tenant: 'x',
      apiToken: 'a',
      rateLimit: { maxRequests: 100 },
    });
    expect(c.rateLimit.maxRequests).toBe(100);
    expect(c.rateLimit.windowMs).toBe(DEFAULT_RATE_LIMIT_CONFIG.windowMs);
  });
});
