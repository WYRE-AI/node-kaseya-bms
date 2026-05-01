/**
 * Service Desk ticket operations.
 *
 * BMS enforces a state machine on `Status` — invalid transitions return 400.
 * The most common transitions are:
 *   New -> Open -> InProgress -> WaitingOnCustomer -> Resolved -> Closed
 * Refer to your tenant's ticket workflow configuration for the canonical set.
 */

import type { HttpClient } from '../http.js';
import type {
  BmsTicket,
  CreateTicketInput,
  CreateTicketNoteInput,
} from '../types/tickets.js';
import type { BmsId } from '../types/common.js';
import {
  PaginatedIterable,
  buildPaginationParams,
  type PaginationParams,
} from '../pagination.js';

/**
 * Operations on Service Desk tickets.
 */
export class TicketsResource {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /** List tickets (single page). */
  async list(params?: PaginationParams): Promise<BmsTicket[]> {
    return this.httpClient.get<BmsTicket[]>(
      '/v2/service/tickets',
      buildPaginationParams(params)
    );
  }

  /** Iterate every ticket. */
  listAll(params?: PaginationParams): PaginatedIterable<BmsTicket> {
    return new PaginatedIterable<BmsTicket>(this.httpClient, '/v2/service/tickets', params);
  }

  /** Get a single ticket by ID. */
  async get(ticketId: BmsId): Promise<BmsTicket> {
    return this.httpClient.get<BmsTicket>(
      `/v2/service/tickets/${encodeURIComponent(String(ticketId))}`
    );
  }

  /** Create a new ticket. Returns the created ticket. */
  async create(input: CreateTicketInput): Promise<BmsTicket> {
    return this.httpClient.post<BmsTicket>('/v2/service/tickets', input);
  }

  /** Append a note to an existing ticket. */
  async addNote(ticketId: BmsId, input: CreateTicketNoteInput): Promise<unknown> {
    return this.httpClient.post<unknown>(
      `/v2/service/tickets/${encodeURIComponent(String(ticketId))}/notes`,
      input
    );
  }
}
