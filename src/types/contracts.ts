/**
 * Contract types.
 */

import type { IsoTimestamp, BmsId } from './common.js';

export interface BmsContract {
  Id?: BmsId;
  ContractId?: BmsId;
  AccountId?: BmsId;
  Name?: string;
  Status?: string;
  StartDate?: IsoTimestamp;
  EndDate?: IsoTimestamp;
  [key: string]: unknown;
}
