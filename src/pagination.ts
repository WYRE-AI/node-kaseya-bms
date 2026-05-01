/**
 * OData-style pagination utilities for the Kaseya BMS API.
 *
 * BMS list endpoints accept `$top` (max 500, default 50) and `$skip`.
 * The unwrapped `Result` field is just an array. The iterator pages by
 * `$top` until a page returns fewer items than requested.
 */

import type { HttpClient } from './http.js';

/** Default page size when caller does not specify one. */
export const DEFAULT_PAGE_SIZE = 50;
/** Maximum page size BMS allows. */
export const MAX_PAGE_SIZE = 500;

/**
 * Parameters supported by paginated BMS list endpoints.
 *
 * Note: `$filter` expressions must use **PascalCase** field names
 * (e.g. `Status eq 'Open'`).
 */
export interface PaginationParams {
  /** Page size (max 500, default 50). */
  top?: number;
  /** Number of records to skip (default 0). */
  skip?: number;
  /** OData filter expression — use PascalCase field names. */
  filter?: string;
  /** OData orderby expression. */
  orderby?: string;
}

/**
 * Map a {@link PaginationParams} to the wire-format `$`-prefixed query keys.
 */
export function buildPaginationParams(
  params?: PaginationParams
): Record<string, string | number | undefined> {
  if (!params) return {};
  const out: Record<string, string | number | undefined> = {};
  if (params.top !== undefined) out['$top'] = params.top;
  if (params.skip !== undefined) out['$skip'] = params.skip;
  if (params.filter !== undefined) out['$filter'] = params.filter;
  if (params.orderby !== undefined) out['$orderby'] = params.orderby;
  return out;
}

/**
 * Async iterable over every record in a paginated endpoint, fetching
 * subsequent pages on demand.
 */
export class PaginatedIterable<T> implements AsyncIterable<T> {
  private readonly httpClient: HttpClient;
  private readonly path: string;
  private readonly extraParams: Record<string, string | number | boolean | undefined>;
  private readonly top: number;
  private readonly startSkip: number;
  private readonly filter?: string;
  private readonly orderby?: string;

  constructor(
    httpClient: HttpClient,
    path: string,
    params?: PaginationParams,
    extraParams?: Record<string, string | number | boolean | undefined>
  ) {
    this.httpClient = httpClient;
    this.path = path;
    this.extraParams = extraParams ?? {};
    this.top = params?.top ?? DEFAULT_PAGE_SIZE;
    this.startSkip = params?.skip ?? 0;
    if (params?.filter !== undefined) this.filter = params.filter;
    if (params?.orderby !== undefined) this.orderby = params.orderby;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let skip = this.startSkip;
    while (true) {
      const params: Record<string, string | number | boolean | undefined> = {
        ...this.extraParams,
        $top: this.top,
        $skip: skip,
      };
      if (this.filter !== undefined) params['$filter'] = this.filter;
      if (this.orderby !== undefined) params['$orderby'] = this.orderby;

      const items = await this.httpClient.get<T[]>(this.path, params);
      const list = Array.isArray(items) ? items : [];
      for (const item of list) yield item;
      if (list.length < this.top) return;
      skip += this.top;
    }
  }

  /** Collect every item into an array. */
  async toArray(): Promise<T[]> {
    const out: T[] = [];
    for await (const item of this) out.push(item);
    return out;
  }
}
