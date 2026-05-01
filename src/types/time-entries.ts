/**
 * Time entry types.
 */

import type { IsoTimestamp, BmsId } from './common.js';

export interface BmsTimeEntry {
  Id?: BmsId;
  TicketId?: BmsId;
  EmployeeId?: BmsId;
  StartTime?: IsoTimestamp;
  EndTime?: IsoTimestamp;
  Duration?: number;
  Description?: string;
  IsBillable?: boolean;
  [key: string]: unknown;
}
