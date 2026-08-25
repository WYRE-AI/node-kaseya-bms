# @wyre-ai/node-kaseya-bms

Comprehensive, fully-typed Node.js/TypeScript library for the Kaseya BMS PSA REST API v2.

## Install

```bash
npm install @wyre-ai/node-kaseya-bms
```

## Quick start

### API token (recommended)

Issue a token from BMS Admin → Service Desk → API Tokens. Long-lived; no refresh needed.

```typescript
import { KaseyaBmsClient } from '@wyre-ai/node-kaseya-bms';

const client = new KaseyaBmsClient({
  tenant: 'my-tenant',                  // <tenant>.bms.kaseya.com
  apiToken: process.env.BMS_TOKEN!,
});

for await (const ticket of client.tickets.listAll({ filter: "Status eq 'Open'" })) {
  console.log(ticket.TicketNumber, ticket.Subject);
}
```

The SDK sends `Authorization: Bearer <api_token>` and `X-Tenant: <tenant>` on every request.

### Kaseya One SSO

Mint a JWT via `https://one.kaseya.com/oauth/token` with `scope=bms.api`. The JWT carries the tenant claim — do **not** also pass `X-Tenant` (some BMS versions reject when both are present).

```typescript
const client = new KaseyaBmsClient({
  baseUrl: 'https://my-tenant.bms.kaseya.com',
  kaseyaOneToken: process.env.K1_JWT!,
});
```

## Resources

| Namespace          | Endpoint                            | Verbs                           |
|--------------------|-------------------------------------|---------------------------------|
| `client.tickets`       | `/api/v2/service/tickets`           | `list`, `listAll`, `get`, `create`, `addNote` |
| `client.timeEntries`   | `/api/v2/service/timeentries`       | `list`, `listAll`               |
| `client.accounts`      | `/api/v2/finance/accounts`          | `list`, `listAll`, `get`        |
| `client.contacts`      | `/api/v2/crm/contacts`              | `list`, `listAll`, `get`        |
| `client.contracts`     | `/api/v2/finance/contracts`         | `list`, `listAll`, `get`        |
| `client.catalog`       | `/api/v2/service/catalog`           | `list`, `listAll`               |
| `client.knowledgeBase` | `/api/v2/service/knowledgebase`     | `list`, `listAll`               |

## Pagination

OData params (`$top` ≤ 500, default 50; `$skip`, `$filter`, `$orderby`):

```typescript
const page = await client.tickets.list({ top: 100, skip: 200 });

for await (const t of client.tickets.listAll({ top: 500, filter: "Status eq 'Open'" })) {
  // streams every page
}
```

## Errors

All errors extend `KaseyaBmsError`. Catch the specific subclass you care about:

| Class                           | When it fires                                                                  |
|---------------------------------|--------------------------------------------------------------------------------|
| `KaseyaBmsAuthenticationError`  | HTTP 401 — bad/missing token                                                  |
| `KaseyaBmsForbiddenError`       | HTTP 403 — credentials valid but lack permission                              |
| `KaseyaBmsNotFoundError`        | HTTP 404                                                                      |
| `KaseyaBmsValidationError`      | HTTP 400 — exposes `.fieldErrors` extracted from the response body            |
| `KaseyaBmsRateLimitError`       | HTTP 429 after retries exhausted; `.retryAfter` in ms                         |
| `KaseyaBmsServerError`          | HTTP 500–503                                                                  |
| `KaseyaBmsApplicationError`     | HTTP 200 with `ResponseCode != 0` (BMS application-layer failure)             |

## Gotchas

- **`$filter` field names are PascalCase.** `Status eq 'Open'` works; `status eq 'open'` returns 400.
- **`X-Tenant` and Kaseya One don't mix.** Use `X-Tenant` only with the API token path. With a K1 JWT, omit it.
- **Vorex compatibility.** Legacy Vorex tenants on BMS endpoints sometimes return `AccountID` instead of `AccountId`. The exported types declare both fields so callers can pick whichever is populated.
- **Ticket status state machine.** BMS enforces valid `Status` transitions; invalid transitions return 400. Common path: `New → Open → InProgress → WaitingOnCustomer → Resolved → Closed` (your tenant's workflow may differ).
- **Rate limits.** 300 req/min per tenant. Sustained over-limit traffic can trigger tenant lockouts. The SDK caps retries at 3 and honors `Retry-After`.

## License

Apache-2.0
