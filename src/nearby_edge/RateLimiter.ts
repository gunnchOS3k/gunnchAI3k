export class RateLimiter {
  private readonly windowMs = 60_000;
  private readonly hits: number[] = [];

  constructor(
    private readonly requestsPerMinute: number,
    private readonly burst: number,
  ) {}

  allow(): { ok: boolean; reason?: string } {
    const now = Date.now();
    while (this.hits.length && now - this.hits[0]! > this.windowMs) this.hits.shift();
    if (this.hits.length >= this.requestsPerMinute) {
      return { ok: false, reason: 'RATE_LIMIT_RPM' };
    }
    const recentBurst = this.hits.filter((t) => now - t < 5_000).length;
    if (recentBurst >= this.burst) {
      return { ok: false, reason: 'RATE_LIMIT_BURST' };
    }
    this.hits.push(now);
    return { ok: true };
  }
}

export class IdleShutdown {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastActivity = Date.now();

  constructor(
    private readonly idleMs: number,
    private readonly onIdle: () => void,
  ) {}

  touch(): void {
    this.lastActivity = Date.now();
    this.arm();
  }

  arm(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (Date.now() - this.lastActivity >= this.idleMs) this.onIdle();
    }, this.idleMs);
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      (this.timer as NodeJS.Timeout).unref?.();
    }
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

export class AuditLog {
  private readonly entries: Array<Record<string, unknown>> = [];

  record(event: string, detail: Record<string, unknown> = {}): void {
    this.entries.push({
      ts: new Date().toISOString(),
      event,
      ...detail,
    });
  }

  snapshot(): Array<Record<string, unknown>> {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }
}
