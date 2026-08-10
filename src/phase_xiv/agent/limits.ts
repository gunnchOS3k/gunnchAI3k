/** Resource limits for gunnchAgent sandboxes. */

export interface AgentLimits {
  maxWallClockMs: number;
  maxToolCalls: number;
  maxFileBytes: number;
  maxShellOutputBytes: number;
  maxConcurrentTools: number;
  networkAllowed: boolean;
}

export const DEFAULT_AGENT_LIMITS: AgentLimits = {
  maxWallClockMs: 120_000,
  maxToolCalls: 64,
  maxFileBytes: 5_000_000,
  maxShellOutputBytes: 1_000_000,
  maxConcurrentTools: 2,
  networkAllowed: false,
};

export class LimitTracker {
  toolCalls = 0;
  startedAt = Date.now();

  constructor(public readonly limits: AgentLimits = { ...DEFAULT_AGENT_LIMITS }) {}

  assertWithinWallClock(): void {
    if (Date.now() - this.startedAt > this.limits.maxWallClockMs) {
      throw new Error('LIMIT_WALL_CLOCK');
    }
  }

  recordToolCall(): void {
    this.assertWithinWallClock();
    this.toolCalls += 1;
    if (this.toolCalls > this.limits.maxToolCalls) {
      throw new Error('LIMIT_TOOL_CALLS');
    }
  }
}
