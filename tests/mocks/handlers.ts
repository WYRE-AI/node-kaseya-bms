/**
 * MSW handlers mocking the Kaseya BMS REST API.
 *
 * Base URL is `https://my-tenant.bms.kaseya.com/api`.
 */

import { http, HttpResponse } from 'msw';

export const BASE = 'https://my-tenant.bms.kaseya.com/api';

/**
 * Wrap a payload in the standard BMS envelope.
 */
export function envelope<T>(result: T, totalRecords?: number): {
  Result: T;
  TotalRecords?: number;
  ResponseCode: number;
  Status: string;
  Error: null;
} {
  const out: {
    Result: T;
    TotalRecords?: number;
    ResponseCode: number;
    Status: string;
    Error: null;
  } = {
    Result: result,
    ResponseCode: 0,
    Status: 'Ok',
    Error: null,
  };
  if (totalRecords !== undefined) out.TotalRecords = totalRecords;
  return out;
}

const TICKETS = [
  { Id: 1, TicketNumber: 'T-001', Subject: 'Disk full', Status: 'Open' },
  { Id: 2, TicketNumber: 'T-002', Subject: 'VPN down', Status: 'InProgress' },
  { Id: 3, TicketNumber: 'T-003', Subject: 'Email bounce', Status: 'Closed' },
];

export const handlers = [
  // Tickets
  http.get(`${BASE}/v2/service/tickets`, ({ request }) => {
    const url = new URL(request.url);
    const top = parseInt(url.searchParams.get('$top') ?? '50', 10);
    const skip = parseInt(url.searchParams.get('$skip') ?? '0', 10);
    return HttpResponse.json(envelope(TICKETS.slice(skip, skip + top), TICKETS.length));
  }),
  http.get(`${BASE}/v2/service/tickets/1`, () => {
    return HttpResponse.json(envelope(TICKETS[0]));
  }),
  http.get(`${BASE}/v2/service/tickets/MISSING`, () => {
    return HttpResponse.json({ Error: 'not found' }, { status: 404 });
  }),
  http.get(`${BASE}/v2/service/tickets/FORBIDDEN`, () => {
    return HttpResponse.json({ Error: 'forbidden' }, { status: 403 });
  }),
  http.get(`${BASE}/v2/service/tickets/RATE_LIMITED`, () => {
    return HttpResponse.json(
      { Error: 'rate limited' },
      { status: 429, headers: { 'Retry-After': '0' } }
    );
  }),
  // Application-level error: HTTP 200 with non-zero ResponseCode.
  http.get(`${BASE}/v2/service/tickets/APPERR`, () => {
    return HttpResponse.json({
      Result: null,
      ResponseCode: 1001,
      Status: 'Failed',
      Error: 'Invalid status transition',
    });
  }),
  // Validation error with field-level messages.
  http.get(`${BASE}/v2/service/tickets/BADFILTER`, () => {
    return HttpResponse.json(
      {
        Error: 'Invalid filter',
        ModelState: {
          $filter: ['Field name must be PascalCase'],
        },
      },
      { status: 400 }
    );
  }),
  http.post(`${BASE}/v2/service/tickets`, async ({ request }) => {
    const body = (await request.json()) as { Subject: string };
    return HttpResponse.json(
      envelope({ Id: 99, TicketNumber: 'T-099', Subject: body.Subject, Status: 'New' })
    );
  }),
  http.post(`${BASE}/v2/service/tickets/1/notes`, async ({ request }) => {
    const body = (await request.json()) as { Note: string };
    return HttpResponse.json(envelope({ Id: 555, Note: body.Note }));
  }),

  // Time entries
  http.get(`${BASE}/v2/service/timeentries`, () => {
    return HttpResponse.json(
      envelope([{ Id: 10, TicketId: 1, Duration: 45, IsBillable: true }])
    );
  }),

  // Accounts
  http.get(`${BASE}/v2/finance/accounts`, () => {
    return HttpResponse.json(
      envelope([{ Id: 1, AccountId: 1, Name: 'Acme Corp', Status: 'Active' }])
    );
  }),

  // Contacts
  http.get(`${BASE}/v2/crm/contacts`, () => {
    return HttpResponse.json(
      envelope([
        { Id: 1, ContactId: 1, FirstName: 'Jane', LastName: 'Doe', Email: 'jane@acme.com' },
      ])
    );
  }),

  // Contracts
  http.get(`${BASE}/v2/finance/contracts`, () => {
    return HttpResponse.json(
      envelope([{ Id: 1, ContractId: 1, Name: 'MSP Plus', Status: 'Active' }])
    );
  }),

  // Catalog
  http.get(`${BASE}/v2/service/catalog`, () => {
    return HttpResponse.json(
      envelope([{ Id: 1, Name: 'Onboarding', Category: 'Project', Price: 1500 }])
    );
  }),

  // Knowledge base
  http.get(`${BASE}/v2/service/knowledgebase`, () => {
    return HttpResponse.json(
      envelope([{ Id: 1, Title: 'Reset VPN', Status: 'Published' }])
    );
  }),
];
