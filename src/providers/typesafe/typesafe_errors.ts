import { redactError } from '../../decision_plane/redaction';

export type TypeSafeErrorCode =
  | 'TIMEOUT'
  | 'CONNECTION_FAILURE'
  | 'AUTH_FAILURE'
  | 'VALIDATION_FAILURE'
  | 'RATE_LIMIT'
  | 'SERVICE_UNAVAILABLE'
  | 'UNEXPECTED_RESPONSE'
  | 'CIRCUIT_OPEN'
  | 'CANCELLED'
  | 'REQUEST_INVALID'
  | 'MODEL_UNAVAILABLE';

export class TypeSafeError extends Error {
  readonly code: TypeSafeErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: TypeSafeErrorCode, message: string, status?: number, retryable = false) {
    super(redactError(message));
    this.name = 'TypeSafeError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function classifyHttpError(status: number, body: string): TypeSafeError {
  const redacted = redactError(body);
  if (status === 401 || status === 403) return new TypeSafeError('AUTH_FAILURE', redacted, status, false);
  if (status === 422) return new TypeSafeError('VALIDATION_FAILURE', redacted, status, false);
  if (status === 429) return new TypeSafeError('RATE_LIMIT', redacted, status, true);
  if (status === 503 || status === 502) return new TypeSafeError('SERVICE_UNAVAILABLE', redacted, status, true);
  return new TypeSafeError('UNEXPECTED_RESPONSE', `HTTP ${status}: ${redacted}`, status, status >= 500);
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
  ) {}

  get open(): boolean {
    if (this.failures < this.threshold) return false;
    if (Date.now() - this.openedAt >= this.cooldownMs) {
      this.failures = 0;
      this.openedAt = 0;
      return false;
    }
    return true;
  }

  succeed(): void {
    this.failures = 0;
    this.openedAt = 0;
  }

  fail(): void {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = Date.now();
  }
}
