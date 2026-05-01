/**
 * Auth tests — verify both API token and Kaseya One SSO header behavior.
 */

import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';
import { envelope, BASE } from '../mocks/handlers.js';
import { AuthManager } from '../../src/auth.js';
import { resolveConfig } from '../../src/config.js';
import { KaseyaBmsClient } from '../../src/client.js';
import { KaseyaBmsAuthenticationError } from '../../src/errors.js';

describe('AuthManager — API token', () => {
  it('returns Authorization + X-Tenant headers', async () => {
    const config = resolveConfig({ tenant: 'my-tenant', apiToken: 'tok' });
    const auth = new AuthManager(config);
    const headers = await auth.getHeaders();
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['X-Tenant']).toBe('my-tenant');
  });
});

describe('AuthManager — Kaseya One SSO', () => {
  it('returns Authorization without X-Tenant', async () => {
    const config = resolveConfig({
      baseUrl: 'https://my-tenant.bms.kaseya.com',
      kaseyaOneToken: 'jwt',
    });
    const auth = new AuthManager(config);
    const headers = await auth.getHeaders();
    expect(headers.Authorization).toBe('Bearer jwt');
    expect(headers['X-Tenant']).toBeUndefined();
  });
});

describe('Auth — wire integration', () => {
  it('sends Authorization: Bearer + X-Tenant on resource requests (apiToken)', async () => {
    let captured: { auth: string | null; tenant: string | null } | null = null;
    server.use(
      http.get(`${BASE}/v2/service/tickets`, ({ request }) => {
        captured = {
          auth: request.headers.get('authorization'),
          tenant: request.headers.get('x-tenant'),
        };
        return HttpResponse.json(envelope([]));
      })
    );
    const c = new KaseyaBmsClient({
      tenant: 'my-tenant',
      apiToken: 'tok-abc',
      rateLimit: { maxRetries: 0, throttleThreshold: 1.1 },
    });
    await c.tickets.list();
    expect(captured).not.toBeNull();
    expect(captured!.auth).toBe('Bearer tok-abc');
    expect(captured!.tenant).toBe('my-tenant');
  });

  it('omits X-Tenant header on K1 path', async () => {
    let tenantHeader: string | null = 'NOT-SET';
    server.use(
      http.get(`${BASE}/v2/service/tickets`, ({ request }) => {
        tenantHeader = request.headers.get('x-tenant');
        return HttpResponse.json(envelope([]));
      })
    );
    const c = new KaseyaBmsClient({
      baseUrl: 'https://my-tenant.bms.kaseya.com',
      kaseyaOneToken: 'jwt-xyz',
      rateLimit: { maxRetries: 0, throttleThreshold: 1.1 },
    });
    await c.tickets.list();
    expect(tenantHeader).toBeNull();
  });

  it('throws KaseyaBmsAuthenticationError when neither credential is present at request time', async () => {
    // Force the manager to be misconfigured by hand — resolveConfig would
    // normally prevent this, so we go around it.
    const config = resolveConfig({ tenant: 'x', apiToken: 'a' });
    // Strip the apiToken to simulate runtime misconfiguration.
    delete (config as { apiToken?: string }).apiToken;
    const auth = new AuthManager(config);
    await expect(auth.getHeaders()).rejects.toBeInstanceOf(KaseyaBmsAuthenticationError);
  });
});
