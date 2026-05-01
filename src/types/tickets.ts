/**
 * Service Desk ticket types.
 */

import type { IsoTimestamp, BmsId } from './common.js';

/**
 * BMS service ticket.
 *
 * Note: legacy Vorex tenants on BMS endpoints sometimes return slightly
 * different field casings (e.g. `AccountID` vs `AccountId`); the SDK does
 * defensive parsing where it can.
 */
export interface BmsTicket {
  Id?: BmsId;
  TicketId?: BmsId;
  TicketNumber?: string;
  Subject?: string;
  Summary?: string;
  Description?: string;
  Status?: string;
  Priority?: string;
  AccountId?: BmsId;
  /** Vorex compat: some tenants return `AccountID`. */
  AccountID?: BmsId;
  ContactId?: BmsId;
  AssignedTo?: string;
  CreatedOn?: IsoTimestamp;
  ModifiedOn?: IsoTimestamp;
  [key: string]: unknown;
}

/**
 * Payload for creating a new ticket.
 */
export interface CreateTicketInput {
  Subject: string;
  Description?: string;
  AccountId?: BmsId;
  ContactId?: BmsId;
  Priority?: string;
  Status?: string;
  AssignedTo?: BmsId;
  [key: string]: unknown;
}

/**
 * Payload for adding a note to an existing ticket.
 */
export interface CreateTicketNoteInput {
  Note: string;
  IsInternal?: boolean;
  [key: string]: unknown;
}
