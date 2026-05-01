import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';
import { envelope, BASE } from '../mocks/handlers.js';
import { buildPaginationParams } from '../../src/pagination.js';
import { KaseyaBmsClient } from '../../src/client.js';

describe('buildPaginationParams', () => {
  it('returns empty for nothing', () => {
    expect(buildPaginationParams()).toEqual({});
  });

  it('maps to OData $-prefixed keys', () => {
    expect(
      buildPaginationParams({
        top: 50,
        skip: 100,
        filter: "Status eq 'Open'",
        orderby: 'CreatedOn desc',
      })
    ).toEqual({
      $top: 50,
      $skip: 100,
      $filter: "Status eq 'Open'",
      $orderby: 'CreatedOn desc',
    });
  });
});

describe('PaginatedIterable', () => {
  it('iterates across multiple pages until a short page is returned', async () => {
    server.use(
      http.get(`${BASE}/v2/service/tickets`, ({ request }) => {
        const url = new URL(request.url);
        const skip = parseInt(url.searchParams.get('$skip') ?? '0', 10);
        const top = parseInt(url.searchParams.get('$top') ?? '50', 10);
        const all = Array.from({ length: 5 }, (_v, i) => ({
          Id: i + 1,
          TicketNumber: `T-00${i + 1}`,
        }));
        const slice = all.slice(skip, skip + top);
        return HttpResponse.json(envelope(slice, all.length));
      })
    );

    const c = new KaseyaBmsClient({
      tenant: 'my-tenant',
      apiToken: 'tok',
      rateLimit: { maxRetries: 0, throttleThreshold: 1.1 },
    });
    const ids: number[] = [];
    for await (const t of c.tickets.listAll({ top: 2 })) {
      ids.push(Number(t.Id));
    }
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it('forwards $filter into each page request', async () => {
    const filtersSeen: string[] = [];
    server.use(
      http.get(`${BASE}/v2/service/tickets`, ({ request }) => {
        const url = new URL(request.url);
        filtersSeen.push(url.searchParams.get('$filter') ?? '');
        return HttpResponse.json(envelope([]));
      })
    );

    const c = new KaseyaBmsClient({
      tenant: 'my-tenant',
      apiToken: 'tok',
      rateLimit: { maxRetries: 0, throttleThreshold: 1.1 },
    });
    await c.tickets.listAll({ top: 50, filter: "Status eq 'Open'" }).toArray();
    expect(filtersSeen[0]).toBe("Status eq 'Open'");
  });
});
