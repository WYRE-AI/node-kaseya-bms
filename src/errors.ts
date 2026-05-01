/**
 * Custom error classes for the Kaseya BMS client.
 */

/**
 * Base error class for all Kaseya BMS errors.
 */
export class KaseyaBmsError extends Error {
  /** HTTP status code (0 for non-HTTP failures). */
  readonly statusCode: number;
  /** Raw response body, if available. */
  readonly response: unknown;

  constructor(message: string, statusCode: number = 0, response?: unknown) {
    super(message);
    this.name = 'KaseyaBmsError';
    this.statusCode = statusCode;
    this.response = response;
    Object.setPrototypeOf(this, KaseyaBmsError.prototype);
  }
}

/**
 * Authentication error (401 / expired token / bad credentials).
 */
export class KaseyaBmsAuthenticationError extends KaseyaBmsError {
  constructor(message: string, statusCode: number = 401, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'KaseyaBmsAuthenticationError';
    Object.setPrototypeOf(this, KaseyaBmsAuthenticationError.prototype);
  }
}

/**
 * Application-level error returned alongside HTTP 200.
 *
 * BMS's standard envelope includes `ResponseCode` and `Error` fields.
 * A non-zero `ResponseCode` or non-null `Error` indicates a business-logic
 * failure even when the HTTP status is 200 OK.
 */
export class KaseyaBmsApplicationError extends KaseyaBmsError {
  /** The BMS `ResponseCode` returned in the response envelope. */
  readonly responseCode: number;

  constructor(message: string, responseCode: number, response?: unknown) {
    super(message, 200, response);
    this.name = 'KaseyaBmsApplicationError';
    this.responseCode = responseCode;
    Object.setPrototypeOf(this, KaseyaBmsApplicationError.prototype);
  }
}

/**
 * Forbidden (403) — credentials valid but lack permission.
 */
export class KaseyaBmsForbiddenError extends KaseyaBmsError {
  constructor(message: string, response?: unknown) {
    super(message, 403, response);
    this.name = 'KaseyaBmsForbiddenError';
    Object.setPrototypeOf(this, KaseyaBmsForbiddenError.prototype);
  }
}

/**
 * Resource not found (404).
 */
export class KaseyaBmsNotFoundError extends KaseyaBmsError {
  constructor(message: string, response?: unknown) {
    super(message, 404, response);
    this.name = 'KaseyaBmsNotFoundError';
    Object.setPrototypeOf(this, KaseyaBmsNotFoundError.prototype);
  }
}

/**
 * Validation error (400). Surfaces field-level errors when available.
 */
export class KaseyaBmsValidationError extends KaseyaBmsError {
  /** Field-level errors keyed by field name, when available. */
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors: Record<string, string[]> = {},
    response?: unknown
  ) {
    super(message, 400, response);
    this.name = 'KaseyaBmsValidationError';
    this.fieldErrors = fieldErrors;
    Object.setPrototypeOf(this, KaseyaBmsValidationError.prototype);
  }
}

/**
 * Rate limit exceeded (429).
 */
export class KaseyaBmsRateLimitError extends KaseyaBmsError {
  /** Suggested retry delay in milliseconds (parsed from Retry-After). */
  readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 5000, response?: unknown) {
    super(message, 429, response);
    this.name = 'KaseyaBmsRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, KaseyaBmsRateLimitError.prototype);
  }
}

/**
 * Server error (500-503).
 */
export class KaseyaBmsServerError extends KaseyaBmsError {
  constructor(message: string, statusCode: number = 500, response?: unknown) {
    super(message, statusCode, response);
    this.name = 'KaseyaBmsServerError';
    Object.setPrototypeOf(this, KaseyaBmsServerError.prototype);
  }
}

/**
 * Best-effort extraction of field-level errors from a 400 response body.
 */
export function extractFieldErrors(body: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!body || typeof body !== 'object') return out;
  const obj = body as Record<string, unknown>;
  // Common shapes: { ModelState: { field: [msg] } } or { errors: { field: [msg] } }
  for (const key of ['ModelState', 'errors', 'Errors', 'fieldErrors']) {
    const value = obj[key];
    if (value && typeof value === 'object') {
      for (const [field, msgs] of Object.entries(value as Record<string, unknown>)) {
        if (Array.isArray(msgs)) {
          out[field] = msgs.map((m) => String(m));
        } else if (typeof msgs === 'string') {
          out[field] = [msgs];
        }
      }
    }
  }
  return out;
}
