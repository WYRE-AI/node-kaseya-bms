/**
 * Main Kaseya BMS Client.
 */

import type { KaseyaBmsConfig, ResolvedConfig } from './config.js';
import { resolveConfig } from './config.js';
import { AuthManager } from './auth.js';
import { HttpClient } from './http.js';
import { RateLimiter } from './rate-limiter.js';
import { TicketsResource } from './resources/tickets.js';
import { TimeEntriesResource } from './resources/time-entries.js';
import { AccountsResource } from './resources/accounts.js';
import { ContactsResource } from './resources/contacts.js';
import { ContractsResource } from './resources/contracts.js';
import { CatalogResource } from './resources/catalog.js';
import { KnowledgeBaseResource } from './resources/knowledge-base.js';

/**
 * Kaseya BMS PSA REST API v2 Client.
 *
 * @example
 * ```typescript
 * import { KaseyaBmsClient } from '@wyre-ai/node-kaseya-bms';
 *
 * // API token auth (recommended)
 * const client = new KaseyaBmsClient({
 *   tenant: 'my-tenant',
 *   apiToken: process.env.BMS_TOKEN!,
 * });
 *
 * for await (const t of client.tickets.listAll({ filter: "Status eq 'Open'" })) {
 *   console.log(t.TicketNumber, t.Subject);
 * }
 * ```
 */
export class KaseyaBmsClient {
  private readonly config: ResolvedConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly auth: AuthManager;
  private readonly httpClient: HttpClient;

  /** Service Desk ticket operations. */
  readonly tickets: TicketsResource;
  /** Time entry operations. */
  readonly timeEntries: TimeEntriesResource;
  /** Customer account operations. */
  readonly accounts: AccountsResource;
  /** CRM contact operations. */
  readonly contacts: ContactsResource;
  /** Finance contract operations. */
  readonly contracts: ContractsResource;
  /** Service catalog operations. */
  readonly catalog: CatalogResource;
  /** Knowledge base operations. */
  readonly knowledgeBase: KnowledgeBaseResource;

  constructor(config: KaseyaBmsConfig) {
    this.config = resolveConfig(config);
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.auth = new AuthManager(this.config);
    this.httpClient = new HttpClient(this.config, this.rateLimiter, this.auth);

    this.tickets = new TicketsResource(this.httpClient);
    this.timeEntries = new TimeEntriesResource(this.httpClient);
    this.accounts = new AccountsResource(this.httpClient);
    this.contacts = new ContactsResource(this.httpClient);
    this.contracts = new ContractsResource(this.httpClient);
    this.catalog = new CatalogResource(this.httpClient);
    this.knowledgeBase = new KnowledgeBaseResource(this.httpClient);
  }

  /** Get the resolved configuration. */
  getConfig(): Readonly<ResolvedConfig> {
    return this.config;
  }
}
