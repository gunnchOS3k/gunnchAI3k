/**
 * Continuance VI — assist timeout + cooperative cancellation.
 */

export class RequestCancelledError extends Error {
  readonly code = 'REQUEST_CANCELLED';
  constructor(requestId: string) {
    super(`Request cancelled: ${requestId}`);
    this.name = 'RequestCancelledError';
  }
}

export class RequestTimeoutError extends Error {
  readonly code = 'REQUEST_TIMEOUT';
  constructor(requestId: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms: ${requestId}`);
    this.name = 'RequestTimeoutError';
  }
}

export class ActiveRequestRegistry {
  private readonly controllers = new Map<string, AbortController>();

  register(requestId: string, external?: AbortSignal): AbortSignal {
    const controller = new AbortController();
    this.controllers.set(requestId, controller);
    if (external) {
      if (external.aborted) {
        controller.abort(external.reason);
      } else {
        external.addEventListener(
          'abort',
          () => {
            controller.abort(external.reason);
          },
          { once: true },
        );
      }
    }
    return controller.signal;
  }

  cancel(requestId: string, reason = 'operator-cancel'): boolean {
    const controller = this.controllers.get(requestId);
    if (!controller) return false;
    controller.abort(reason);
    return true;
  }

  release(requestId: string): void {
    this.controllers.delete(requestId);
  }

  listActive(): string[] {
    return [...this.controllers.keys()];
  }
}

export async function withTimeoutAndCancel<T>(
  requestId: string,
  signal: AbortSignal,
  timeoutMs: number | undefined,
  work: () => Promise<T>,
): Promise<T> {
  if (signal.aborted) {
    throw new RequestCancelledError(requestId);
  }

  const timeout =
    typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : undefined;

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      reject(new RequestCancelledError(requestId));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });

    if (timeout !== undefined) {
      timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        reject(new RequestTimeoutError(requestId, timeout));
      }, timeout);
    }

    work()
      .then((value) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      })
      .catch((err) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        reject(err);
      });
  });
}
