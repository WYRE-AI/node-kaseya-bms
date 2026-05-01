/**
 * HTTP layer for the Kaseya BMS REST API.
 *
 * Responsibilities:
 *   - Inject auth headers from {@link AuthManager}.
 *   - Apply OData query params.
 *   - Unwrap the standard `{ Result, ResponseCode, Status, Error }` envelope.
 *   - Map error responses (HTTP and application-level) to typed errors.
 *   - Retry transient 5xx and 429 with backoff (capped at 3 retries).
 */

import type { ResolvedConfig } from './config.js';
import type { RateLimiter } from './rate-limiter.js';
import type { AuthManager } from './auth.js';
import {
  KaseyaBmsError,
  KaseyaBmsAuthenticationError,
  KaseyaBmsApplicationError,
  KaseyaBmsForbiddenError,
  KaseyaBmsNotFoundError,
  KaseyaBmsRateLimitError,
  KaseyaBmsServerError,
  KaseyaBmsValidationError,
  extractFieldErrors,
} from './errors.js';

/**
 * Standard BMS response envelope.
 */
export interface BmsEnvelope<T> {
  Result?: T;
  TotalRecords?: number;
  ResponseCode?: number;
  Status?: string;
  Error?: string | null;
}

/**
 * OData query parameters supported by BMS list endpoints.
 *
 * Note: BMS uses **PascalCase** field names in `$filter` expressions
 * (e.g. `Status eq 'Open'`, not `status eq 'open'`). camelCase causes 400s.
 */
export interface ODataParams {
  /** Page size (max 500, default 50). */
  $top?: number;
  /** Number of records to skip (default 0). */
  $skip?: number;
  /** OData filter expression — use PascalCase field names. */
  $filter?: string;
  /** OData orderby expression. */
  $orderby?: string;
  /** Include additional arbitrary params. */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Options for an HTTP request.
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  /** Skip envelope unwrapping (for non-standard endpoints). */
  raw?: boolean;
}

/**
 * Build a query string from a flat params object, omitting undefined values.
 */
export function buildQueryString(
  params?: Record<string, string | number | boolean | undefined>
): string {
  if (!params) return '';
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    entries.push([key, String(value)]);
  }
  if (entries.length === 0) return '';
  const search = new URLSearchParams();
  for (const [key, value] of entries) search.append(key, value);
  return `?${search.toString()}`;
}

/**
 * Ensure the path begins with a leading `/`.
 */
export function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Authenticated HTTP client for the Kaseya BMS API.
 */
export class HttpClient {
  private readonly config: ResolvedConfig;
  private readonly rateLimiter: RateLimiter;
  private readonly auth: AuthManager;

  constructor(config: ResolvedConfig, rateLimiter: RateLimiter, auth: AuthManager) {
    this.config = config;
    this.rateLimiter = rateLimiter;
    this.auth = auth;
  }

  /**
   * Make an authenticated request, returning the unwrapped `Result` field.
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, raw = false } = options;
    const queryString = buildQueryString(params);
    const url = `${this.config.baseUrl}${normalizePath(path)}${queryString}`;
    const bodyString = body === undefined ? '' : JSON.stringify(body);
    return this.executeRequest<T>(url, method, bodyString, raw, 0, false);
  }

  /** Convenience: GET an endpoint and return the unwrapped result. */
  async get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  /** Convenience: POST a body and return the unwrapped result. */
  async post<T>(
    path: string,
    body?: unknown,
    params?: RequestOptions['params']
  ): Promise<T> {
    return this.request<T>(path, { method: 'POST', body, params });
  }

  /** Convenience: PUT a body and return the unwrapped result. */
  async put<T>(
    path: string,
    body?: unknown,
    params?: RequestOptions['params']
  ): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body, params });
  }

  private async executeRequest<T>(
    url: string,
    method: string,
    bodyString: string,
    raw: boolean,
    retryCount: number,
    isRetryAfterReauth: boolean
  ): Promise<T> {
    await this.rateLimiter.waitForSlot();

    const authHeaders = await this.auth.getHeaders();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: authHeaders.Authorization,
    };
    if (authHeaders['X-Tenant']) {
      headers['X-Tenant'] = authHeaders['X-Tenant'];
    }
    if (bodyString) headers['Content-Type'] = 'application/json';

    this.rateLimiter.recordRequest();

    const response = await fetch(url, {
      method,
      headers,
      body: bodyString || undefined,
    });

    return this.handleResponse<T>(response, url, method, bodyString, raw, retryCount, isRetryAfterReauth);
  }

  private async handleResponse<T>(
    response: Response,
    url: string,
    method: string,
    bodyString: string,
    raw: boolean,
    retryCount: number,
    isRetryAfterReauth: boolean
  ): Promise<T> {
    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        return (text === '' ? ({} as T) : (text as unknown as T));
      }
      const json = (await response.json()) as BmsEnvelope<T> | T;
      if (raw) return json as T;
      return this.unwrapEnvelope<T>(json as BmsEnvelope<T>);
    }

    let responseBody: unknown;
    try {
      responseBody = await response.clone().json();
    } catch {
      try {
        responseBody = await response.text();
      } catch {
        responseBody = undefined;
      }
    }

    switch (response.status) {
      case 400: {
        const fieldErrors = extractFieldErrors(responseBody);
        const message =
          extractMessage(responseBody) ?? 'Bad request — verify $filter uses PascalCase field names';
        throw new KaseyaBmsValidationError(message, fieldErrors, responseBody);
      }
      case 401: {
        // BMS API tokens are long-lived. A 401 means the token is bad —
        // surface immediately rather than spinning on a refresh that
        // can't help.
        if (!isRetryAfterReauth) {
          this.auth.invalidate();
          await this.auth.refresh();
          return this.executeRequest<T>(url, method, bodyString, raw, retryCount, true);
        }
        throw new KaseyaBmsAuthenticationError(
          'Authentication failed — verify apiToken / kaseyaOneToken and tenant',
          401,
          responseBody
        );
      }
      case 403:
        throw new KaseyaBmsForbiddenError('Access forbidden', responseBody);
      case 404:
        throw new KaseyaBmsNotFoundError('Resource not found', responseBody);
      case 429: {
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        if (this.rateLimiter.shouldRetry(retryCount)) {
          const delay = this.rateLimiter.calculateRetryDelay(retryCount, retryAfterSeconds);
          await this.sleep(delay);
          return this.executeRequest<T>(url, method, bodyString, raw, retryCount + 1, isRetryAfterReauth);
        }
        throw new KaseyaBmsRateLimitError(
          'Rate limit exceeded and max retries reached',
          (retryAfterSeconds ?? 5) * 1000,
          responseBody
        );
      }
      case 503: {
        if (this.rateLimiter.shouldRetry(retryCount)) {
          await this.sleep(this.rateLimiter.calculateRetryDelay(retryCount));
          return this.executeRequest<T>(url, method, bodyString, raw, retryCount + 1, isRetryAfterReauth);
        }
        throw new KaseyaBmsServerError('Service unavailable', 503, responseBody);
      }
      default:
        if (response.status >= 500) {
          if (retryCount === 0) {
            await this.sleep(1000);
            return this.executeRequest<T>(url, method, bodyString, raw, 1, isRetryAfterReauth);
          }
          throw new KaseyaBmsServerError(
            `Server error: ${response.status} ${response.statusText}`,
            response.status,
            responseBody
          );
        }
        throw new KaseyaBmsError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          responseBody
        );
    }
  }

  /**
   * Unwrap the standard BMS envelope. A non-zero `ResponseCode` or non-null
   * `Error` is treated as failure even on HTTP 200.
   */
  private unwrapEnvelope<T>(envelope: BmsEnvelope<T>): T {
    if (
      envelope &&
      typeof envelope === 'object' &&
      ('ResponseCode' in envelope || 'Result' in envelope || 'Error' in envelope)
    ) {
      const code = envelope.ResponseCode;
      if ((code !== undefined && code !== 0) || (envelope.Error !== undefined && envelope.Error !== null)) {
        throw new KaseyaBmsApplicationError(
          `BMS application error: ${envelope.Error ?? `ResponseCode=${String(code)}`}`,
          code ?? -1,
          envelope
        );
      }
      return envelope.Result as T;
    }
    return envelope as unknown as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Best-effort extraction of a top-level error message from a 4xx body. */
function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const obj = body as Record<string, unknown>;
  for (const key of ['Error', 'error', 'Message', 'message']) {
    const v = obj[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}
