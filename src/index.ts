/**
 * @wyre-technology/node-kaseya-bms
 *
 * Comprehensive, fully-typed Node.js/TypeScript library for the Kaseya BMS
 * PSA REST API v2.
 */

// Main client
export { KaseyaBmsClient } from './client.js';

// Configuration
export type { KaseyaBmsConfig, RateLimitConfig, ResolvedConfig } from './config.js';
export { DEFAULT_RATE_LIMIT_CONFIG, normalizeBaseUrl, buildBaseUrlFromTenant } from './config.js';

// Errors
export {
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

// Auth helpers
export { AuthManager } from './auth.js';
export type { AuthHeaders } from './auth.js';

// HTTP helpers
export { HttpClient, normalizePath, buildQueryString } from './http.js';
export type { ODataParams, RequestOptions, BmsEnvelope } from './http.js';

// Pagination
export {
  PaginatedIterable,
  buildPaginationParams,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './pagination.js';
export type { PaginationParams } from './pagination.js';

// Resource classes
export { TicketsResource } from './resources/tickets.js';
export { TimeEntriesResource } from './resources/time-entries.js';
export { AccountsResource } from './resources/accounts.js';
export { ContactsResource } from './resources/contacts.js';
export { ContractsResource } from './resources/contracts.js';
export { CatalogResource } from './resources/catalog.js';
export { KnowledgeBaseResource } from './resources/knowledge-base.js';

// Domain types
export * from './types/index.js';
