/**
 * Account (customer) types.
 */

import type { BmsId } from './common.js';

export interface BmsAccount {
  Id?: BmsId;
  AccountId?: BmsId;
  /** Vorex compat: some tenants return `AccountID`. */
  AccountID?: BmsId;
  Name?: string;
  AccountName?: string;
  Status?: string;
  [key: string]: unknown;
}
