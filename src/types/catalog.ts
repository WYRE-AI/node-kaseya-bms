/**
 * Service catalog types.
 */

import type { BmsId } from './common.js';

export interface BmsCatalogItem {
  Id?: BmsId;
  Name?: string;
  Description?: string;
  Category?: string;
  Price?: number;
  [key: string]: unknown;
}
