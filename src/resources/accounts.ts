/**
 * Account (customer) operations.
 */

import type { HttpClient } from '../http.js';
import type { BmsAccount } from '../types/accounts.js';
import type { BmsId } from '../types/common.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on customer accounts.
 *
 * Defensive parsing note: legacy Vorex tenants on BMS endpoints sometimes
 * return `AccountID` instead of `AccountId`. The {@link BmsAccount} type
 * declares both so callers can pick whichever is populated.
 */
export class AccountsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List accounts (single page). */
  async list(params?: PaginationParams): Promise<BmsAccount[]> {
    return this.httpClient.get<BmsAccount[]>(
      '/v2/finance/accounts',
      buildPaginationParams(params)
    );
  }

  /** Iterate every account. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsAccount> {
    return new PaginatedIterable<BmsAccount>(
      this.httpClient,
      '/v2/finance/accounts',
      params
    );
  }

  /** Get a single account by ID. */
  async get(accountId: BmsId): Promise<BmsAccount> {
    return this.httpClient.get<BmsAccount>(
      `/v2/finance/accounts/${encodeURIComponent(String(accountId))}`
    );
  }
}
