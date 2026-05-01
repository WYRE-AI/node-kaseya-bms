/**
 * Contact types.
 */

import type { BmsId } from './common.js';

export interface BmsContact {
  Id?: BmsId;
  ContactId?: BmsId;
  AccountId?: BmsId;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  [key: string]: unknown;
}
