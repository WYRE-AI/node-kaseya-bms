import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';
import { envelope, BASE } from '../mocks/handlers.js';
import { KaseyaBmsClient } from '../../src/client.js';
import {
  KaseyaBmsForbiddenError,
  KaseyaBmsNotFoundError,
  KaseyaBmsRateLimitError,
} from '../../src/errors.js';

function makeClient(): KaseyaBmsClient {
  return new KaseyaBmsClient({
    tenant: 'my-tenant',
    apiToken: 'tok',
    rateLimit: { maxRetries: 0, retryAfterMs: 1, throttleThreshold: 1.1 },
  });
}

describe('KaseyaBmsClient', () => {
  it('exposes all resource namespaces', () => {
    const c = makeClient();
    expect(c.tickets).toBeDefined();
    expect(c.timeEntries).toBeDefined();
    expect(c.accounts).toBeDefined();
    expect(c.contacts).toBeDefined();
    expect(c.contracts).toBeDefined();
    expect(c.catalog).toBeDefined();
    expect(c.knowledgeBase).toBeDefined();
  });

  it('lists tickets', async () => {
    const c = makeClient();
    const list = await c.tickets.list();
    expect(list[0]?.TicketNumber).toBe('T-001');
  });

  it('gets a single ticket', async () => {
    const c = makeClient();
    const t = await c.tickets.get(1);
    expect(t.Subject).toBe('Disk full');
  });

  it('creates a ticket', async () => {
    const c = makeClient();
    const t = await c.tickets.create({ Subject: 'New issue' });
    expect(t.Id).toBe(99);
    expect(t.Subject).toBe('New issue');
  });

  it('adds a note to a ticket', async () => {
    const c = makeClient();
    const note = (await c.tickets.addNote(1, { Note: 'investigating' })) as {
      Note: string;
    };
    expect(note.Note).toBe('investigating');
  });

  it('lists time entries', async () => {
    const c = makeClient();
    const entries = await c.timeEntries.list();
    expect(entries[0]?.Duration).toBe(45);
  });

  it('lists accounts', async () => {
    const c = makeClient();
    const accts = await c.accounts.list();
    expect(accts[0]?.Name).toBe('Acme Corp');
  });

  it('lists contacts', async () => {
    const c = makeClient();
    const contacts = await c.contacts.list();
    expect(contacts[0]?.Email).toBe('jane@acme.com');
  });

  it('lists contracts', async () => {
    const c = makeClient();
    const contracts = await c.contracts.list();
    expect(contracts[0]?.Name).toBe('MSP Plus');
  });

  it('lists catalog items', async () => {
    const c = makeClient();
    const items = await c.catalog.list();
    expect(items[0]?.Name).toBe('Onboarding');
  });

  it('lists knowledge base articles', async () => {
    const c = makeClient();
    const arts = await c.knowledgeBase.list();
    expect(arts[0]?.Title).toBe('Reset VPN');
  });

  it('maps 404 to KaseyaBmsNotFoundError', async () => {
    const c = makeClient();
    await expect(c.tickets.get('MISSING')).rejects.toBeInstanceOf(KaseyaBmsNotFoundError);
  });

  it('maps 403 to KaseyaBmsForbiddenError', async () => {
    const c = makeClient();
    await expect(c.tickets.get('FORBIDDEN')).rejects.toBeInstanceOf(KaseyaBmsForbiddenError);
  });

  it('maps 429 (after retries exhausted) to KaseyaBmsRateLimitError', async () => {
    const c = makeClient();
    await expect(c.tickets.get('RATE_LIMITED')).rejects.toBeInstanceOf(KaseyaBmsRateLimitError);
  });

  it('retries 429 with backoff and succeeds when permitted', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v2/service/tickets/77`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(
            { Error: 'rate limited' },
            { status: 429, headers: { 'Retry-After': '0' } }
          );
        }
        return HttpResponse.json(envelope({ Id: 77, Subject: 'OK' }));
      })
    );

    const c = new KaseyaBmsClient({
      tenant: 'my-tenant',
      apiToken: 'tok',
      rateLimit: { maxRetries: 3, retryAfterMs: 1, throttleThreshold: 1.1 },
    });
    const t = await c.tickets.get(77);
    expect(t.Id).toBe(77);
    expect(calls).toBe(2);
  });
});
