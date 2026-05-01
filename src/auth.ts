/**
 * Authentication for the Kaseya BMS REST API.
 *
 * Two paths are supported:
 *
 * 1. API Token — issued from BMS Admin → Service Desk → API Tokens.
 *    Long-lived. Sent as `Authorization: Bearer <api_token>` plus a
 *    required `X-Tenant: <tenant>` header on every request.
 *
 * 2. Kaseya One SSO — JWT minted via `https://one.kaseya.com/oauth/token`
 *    with `scope=bms.api`. The JWT carries the tenant claim — DO NOT
 *    send `X-Tenant` (some BMS versions reject when both are present).
 *
 * For the SDK's purposes there's no token-exchange step: callers supply
 * either credential up front and we simply attach the right headers.
 */

import type { ResolvedConfig } from './config.js';
import { KaseyaBmsAuthenticationError } from './errors.js';

/**
 * Headers required to authenticate a single request.
 */
export interface AuthHeaders {
  Authorization: string;
  /** Present only when using the API token path. */
  'X-Tenant'?: string;
}

/**
 * Resolves authentication headers for outgoing requests.
 *
 * BMS authentication is stateless from the SDK's perspective: there's no
 * cached token to refresh. The class exists so the HTTP layer can call a
 * uniform interface and so that future support for Kaseya One token
 * refresh (e.g. exchange a refresh token for a new JWT) can be slotted
 * in without changing call sites.
 */
export class AuthManager {
  private readonly config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  /**
   * Build the auth headers for a request.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async getHeaders(): Promise<AuthHeaders> {
    if (this.config.apiToken) {
      if (!this.config.tenant) {
        throw new KaseyaBmsAuthenticationError(
          'tenant is required when authenticating with apiToken'
        );
      }
      return {
        Authorization: `Bearer ${this.config.apiToken}`,
        'X-Tenant': this.config.tenant,
      };
    }
    if (this.config.kaseyaOneToken) {
      // K1 path: do NOT send X-Tenant — some BMS versions reject when both
      // a tenant header and a JWT bearing a tenant claim are present.
      return {
        Authorization: `Bearer ${this.config.kaseyaOneToken}`,
      };
    }
    throw new KaseyaBmsAuthenticationError(
      'No credentials configured for authentication'
    );
  }

  /**
   * Hook for future token refresh logic. Currently a no-op since both
   * supported credentials are long-lived.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async refresh(): Promise<void> {
    // No-op for now.
  }

  /** Hook to invalidate cached state. Currently a no-op. */
  invalidate(): void {
    // No-op for now.
  }
}
