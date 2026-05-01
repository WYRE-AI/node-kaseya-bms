/**
 * Time entry operations.
 */

import type { HttpClient } from '../http.js';
import type { BmsTimeEntry } from '../types/time-entries.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on time entries.
 */
export class TimeEntriesResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List time entries (single page). */
  async list(params?: PaginationParams): Promise<BmsTimeEntry[]> {
    return this.httpClient.get<BmsTimeEntry[]>(
      '/v2/service/timeentries',
      buildPaginationParams(params)
    );
  }

  /** Iterate every time entry. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsTimeEntry> {
    return new PaginatedIterable<BmsTimeEntry>(
      this.httpClient,
      '/v2/service/timeentries',
      params
    );
  }
}
