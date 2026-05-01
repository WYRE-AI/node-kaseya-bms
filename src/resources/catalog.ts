/**
 * Service catalog operations.
 */

import type { HttpClient } from '../http.js';
import type { BmsCatalogItem } from '../types/catalog.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on the service catalog.
 */
export class CatalogResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List catalog items (single page). */
  async list(params?: PaginationParams): Promise<BmsCatalogItem[]> {
    return this.httpClient.get<BmsCatalogItem[]>(
      '/v2/service/catalog',
      buildPaginationParams(params)
    );
  }

  /** Iterate every catalog item. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsCatalogItem> {
    return new PaginatedIterable<BmsCatalogItem>(
      this.httpClient,
      '/v2/service/catalog',
      params
    );
  }
}
