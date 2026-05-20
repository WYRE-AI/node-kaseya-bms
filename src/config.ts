/**
 * Configuration types and defaults for the Kaseya BMS client.
 */

import { KaseyaBmsError } from './errors.js';

/**
 * Rate limiting configuration.
 *
 * BMS publishes 300 req/min per tenant. Sustained over-limit traffic can
 * trigger tenant-level lockouts, so we cap retries at 3.
 */
export interface RateLimitConfig {
  /** Whether rate limiting is enabled (default: true). */
  enabled: boolean;
  /** Maximum requests per window (default: 300). */
  maxRequests: number;
  /** Window duration in milliseconds (default: 60_000). */
  windowMs: number;
  /** Threshold percentage to start throttling (default: 0.8). */
  throttleThreshold: number;
  /** Default delay between retries on 429 (default: 5_000 ms). */
  retryAfterMs: number;
  /** Maximum retry attempts on rate limit / transient errors (default: 3). */
  maxRetries: number;
}

/**
 * Default rate limit configuration tuned for Kaseya BMS.
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  enabled: true,
  maxRequests: 300,
  windowMs: 60_000,
  throttleThreshold: 0.8,
  retryAfterMs: 5_000,
  maxRetries: 3,
};

/**
 * Configuration for the Kaseya BMS client.
 *
 * BMS is per-tenant. Provide either an explicit `baseUrl` like
 * `https://my-tenant.bms.kaseya.com/api`, or a `tenant` subdomain alone
 * and the SDK will assemble the URL.
 *
 * Two authentication modes are supported:
 *   1. API Token — long-lived bearer token from BMS Admin → API Tokens.
 *      Requires `tenant` (sent as `X-Tenant` header).
 *   2. Kaseya One SSO — JWT minted via `https://one.kaseya.com/oauth/token`
 *      with `scope=bms.api`. The JWT carries the tenant claim — do NOT
 *      send `X-Tenant` (some BMS versions reject it).
 */
export interface KaseyaBmsConfig {
  /**
   * Tenant subdomain (e.g. `my-tenant` from `my-tenant.bms.kaseya.com`).
   * Required when using `apiToken` (sent as `X-Tenant` header).
   * Optional but recommended when using `kaseyaOneToken` for URL building.
   */
  tenant?: string;
  /**
   * Tenant base URL. If omitted, derived from `tenant`. Either form is accepted:
   *   - `https://my-tenant.bms.kaseya.com`
   *   - `https://my-tenant.bms.kaseya.com/api`
   */
  baseUrl?: string;
  /** API token issued from BMS Admin → Service Desk → API Tokens. */
  apiToken?: string;
  /** Kaseya One SSO bearer token (JWT). Mutually exclusive with `apiToken`. */
  kaseyaOneToken?: string;
  /** Rate limiting configuration overrides. */
  rateLimit?: Partial<RateLimitConfig>;
  /**
   * Override the clock used to schedule token refresh (testing only).
   */
  now?: () => number;
}

/**
 * Resolved configuration with defaults applied.
 */
export interface ResolvedConfig {
  baseUrl: string;
  tenant?: string;
  apiToken?: string;
  kaseyaOneToken?: string;
  rateLimit: RateLimitConfig;
  now?: () => number;
}

/**
 * Returns true when a hostname is a local loopback address that is
 * permitted to use plain `http://` (for local testing only).
 */
function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * Normalize a tenant base URL by:
 *   - validating the scheme is `https:` (or `http:` for localhost/127.0.0.1)
 *   - stripping trailing slashes
 *   - appending `/api` when not already present
 *
 * @throws {KaseyaBmsError} when the URL is malformed or uses a non-HTTPS
 *   scheme against a non-local host.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new KaseyaBmsError(`Invalid baseUrl: ${baseUrl}`);
  }
  if (parsed.protocol !== 'https:') {
    if (parsed.protocol === 'http:' && isLocalHost(parsed.hostname)) {
      // allowed for local testing
    } else {
      throw new KaseyaBmsError(
        `baseUrl must use https:// (got ${parsed.protocol}//${parsed.hostname}). ` +
          'Plain http:// is only permitted for localhost/127.0.0.1.'
      );
    }
  }
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (/\/api$/i.test(trimmed)) return trimmed;
  return `${trimmed}/api`;
}

/**
 * Build a base URL from a tenant subdomain.
 */
export function buildBaseUrlFromTenant(tenant: string): string {
  return `https://${tenant}.bms.kaseya.com/api`;
}

/**
 * Resolve a {@link KaseyaBmsConfig} by validating credentials and applying defaults.
 */
export function resolveConfig(config: KaseyaBmsConfig): ResolvedConfig {
  const hasApiToken = Boolean(config.apiToken);
  const hasSso = Boolean(config.kaseyaOneToken);

  if (!hasApiToken && !hasSso) {
    throw new Error(
      'Either apiToken or kaseyaOneToken must be provided'
    );
  }
  if (hasApiToken && hasSso) {
    throw new Error(
      'Provide either apiToken OR kaseyaOneToken, not both'
    );
  }
  if (hasApiToken && !config.tenant) {
    throw new Error(
      'tenant is required when using apiToken (sent as X-Tenant header)'
    );
  }

  let baseUrl: string;
  if (config.baseUrl) {
    baseUrl = normalizeBaseUrl(config.baseUrl);
  } else if (config.tenant) {
    baseUrl = buildBaseUrlFromTenant(config.tenant);
  } else {
    throw new Error(
      'Either baseUrl or tenant must be provided to resolve the API URL'
    );
  }

  const resolved: ResolvedConfig = {
    baseUrl,
    rateLimit: { ...DEFAULT_RATE_LIMIT_CONFIG, ...config.rateLimit },
  };
  if (config.tenant !== undefined) resolved.tenant = config.tenant;
  if (config.apiToken !== undefined) resolved.apiToken = config.apiToken;
  if (config.kaseyaOneToken !== undefined) resolved.kaseyaOneToken = config.kaseyaOneToken;
  if (config.now !== undefined) resolved.now = config.now;
  return resolved;
}
