/**
 * Contact operations.
 */

import type { HttpClient } from '../http.js';
import type { BmsContact } from '../types/contacts.js';
import type { BmsId } from '../types/common.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on CRM contacts.
 */
export class ContactsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List contacts (single page). */
  async list(params?: PaginationParams): Promise<BmsContact[]> {
    return this.httpClient.get<BmsContact[]>(
      '/v2/crm/contacts',
      buildPaginationParams(params)
    );
  }

  /** Iterate every contact. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsContact> {
    return new PaginatedIterable<BmsContact>(this.httpClient, '/v2/crm/contacts', params);
  }

  /** Get a single contact by ID. */
  async get(contactId: BmsId): Promise<BmsContact> {
    return this.httpClient.get<BmsContact>(
      `/v2/crm/contacts/${encodeURIComponent(String(contactId))}`
    );
  }
}
