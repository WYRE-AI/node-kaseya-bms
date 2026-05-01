/**
 * Knowledge base article types.
 */

import type { IsoTimestamp, BmsId } from './common.js';

export interface BmsKnowledgeBaseArticle {
  Id?: BmsId;
  Title?: string;
  Body?: string;
  Category?: string;
  Status?: string;
  CreatedOn?: IsoTimestamp;
  ModifiedOn?: IsoTimestamp;
  [key: string]: unknown;
}
