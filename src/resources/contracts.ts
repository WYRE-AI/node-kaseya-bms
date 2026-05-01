/**
 * Contract operations.
 */

import type { HttpClient } from '../http.js';
import type { BmsContract } from '../types/contracts.js';
import type { BmsId } from '../types/common.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on finance contracts.
 */
export class ContractsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List contracts (single page). */
  async list(params?: PaginationParams): Promise<BmsContract[]> {
    return this.httpClient.get<BmsContract[]>(
      '/v2/finance/contracts',
      buildPaginationParams(params)
    );
  }

  /** Iterate every contract. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsContract> {
    return new PaginatedIterable<BmsContract>(
      this.httpClient,
      '/v2/finance/contracts',
      params
    );
  }

  /** Get a single contract by ID. */
  async get(contractId: BmsId): Promise<BmsContract> {
    return this.httpClient.get<BmsContract>(
      `/v2/finance/contracts/${encodeURIComponent(String(contractId))}`
    );
  }
}
