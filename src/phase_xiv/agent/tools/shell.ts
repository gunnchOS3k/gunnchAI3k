/** Sandboxed shell execution (local argv only; no network by default). */

import { spawnSync } from 'node:child_process';
import type { AgentSandbox } from '../sandbox';
import type { LimitTracker } from '../limits';

export interface ShellResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

const ALLOWED_BINARIES = new Set(['node', 'python3', 'npm', 'npx', 'echo', 'true', 'false', 'ls', 'cat']);

export class ShellTool {
  constructor(
    private readonly sandbox: AgentSandbox,
    private readonly limits: LimitTracker,
  ) {}

  exec(cmd: string, argv: string[] = [], timeoutMs = 15_000): ShellResult {
    this.limits.recordToolCall();
    if (!ALLOWED_BINARIES.has(cmd)) {
      throw new Error(`SHELL_BINARY_DENIED:${cmd}`);
    }
    const res = spawnSync(cmd, argv, {
      cwd: this.sandbox.root,
      encoding: 'utf8',
      timeout: timeoutMs,
      env: { ...process.env, PATH: process.env.PATH, GUNNCH_AGENT_SANDBOX: '1' },
    });
    const stdout = (res.stdout || '').slice(0, this.limits.limits.maxShellOutputBytes);
    const stderr = (res.stderr || '').slice(0, this.limits.limits.maxShellOutputBytes);
    return { ok: res.status === 0, stdout, stderr, code: res.status };
  }
}
