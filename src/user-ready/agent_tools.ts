/**
 * Allowlisted custom-agent tools (AI-UR-009).
 * Fail-closed. No unrestricted shell/FS/silent network.
 * Each tool: capability, permission, arg/output schema, audit, cancel, timeout, failure.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ArtifactAssist } from './artifacts';
import { SourceGroundedNotebook } from './source_grounded';

export type AgentToolPermission = 'files.read' | 'files.write' | 'memory.read' | 'memory.write';

export type AgentToolId =
  | 'local.files.read'
  | 'sandbox.files.write'
  | 'source.retrieve'
  | 'calc.evaluate'
  | 'structured.transform'
  | 'artifact.create'
  | 'waike.course.query'
  | 'code.sandbox.exec';

export interface ToolSchema {
  id: AgentToolId;
  capability: string;
  permission: AgentToolPermission;
  timeoutMs: number;
  args: Record<string, string>;
  output: Record<string, string>;
}

export const AGENT_TOOL_CATALOG: ToolSchema[] = [
  {
    id: 'local.files.read',
    capability: 'Read a UTF-8 file inside the allowlisted read root.',
    permission: 'files.read',
    timeoutMs: 5_000,
    args: { path: 'string, relative to readRoot' },
    output: { text: 'string', bytes: 'number' },
  },
  {
    id: 'sandbox.files.write',
    capability: 'Write a UTF-8 file inside the session sandbox only.',
    permission: 'files.write',
    timeoutMs: 5_000,
    args: { path: 'string', content: 'string' },
    output: { path: 'string', bytes: 'number' },
  },
  {
    id: 'source.retrieve',
    capability: 'Retrieve excerpts from the attached local corpus (no web).',
    permission: 'files.read',
    timeoutMs: 8_000,
    args: { query: 'string' },
    output: { grounded: 'boolean', citations: 'array' },
  },
  {
    id: 'calc.evaluate',
    capability: 'Evaluate a restricted arithmetic expression.',
    permission: 'files.read',
    timeoutMs: 3_000,
    args: { expr: 'string of digits and + - * / ( ) .' },
    output: { value: 'number' },
  },
  {
    id: 'structured.transform',
    capability: 'Pick/map JSON records without executing code.',
    permission: 'files.read',
    timeoutMs: 5_000,
    args: { op: 'pick|pluck|count', data: 'json', keys: 'string[]?' },
    output: { result: 'json' },
  },
  {
    id: 'artifact.create',
    capability: 'Create a sandbox artifact file (md/txt/json).',
    permission: 'files.write',
    timeoutMs: 10_000,
    args: { title: 'string', body: 'string', kind: 'code|notebook' },
    output: { path: 'string', exists: 'boolean' },
  },
  {
    id: 'waike.course.query',
    capability: 'Read public WAIKE course metadata. Instructor keys blocked.',
    permission: 'files.read',
    timeoutMs: 5_000,
    args: { courseId: 'string', field: 'title|objectives|lesson_excerpt' },
    output: { courseId: 'string', value: 'string|object' },
  },
  {
    id: 'code.sandbox.exec',
    capability: 'Run allowlisted Python arithmetic in an isolated cwd; no network.',
    permission: 'files.write',
    timeoutMs: 8_000,
    args: { code: 'string python subset' },
    output: { stdout: 'string', exit: 'number' },
  },
];

const FORBIDDEN_WAIKE = [
  /answer_keys/i,
  /instructor\/.*key/i,
  /gold_key/i,
  /exam_key/i,
  /\.env/i,
];

const FORBIDDEN_CODE = [
  /import\s+(os|sys|subprocess|socket|urllib|http|ctypes|pathlib)/,
  /open\s*\(\s*['"]\//,
  /__import__/,
  /eval\s*\(/,
  /exec\s*\(/,
  /system\s*\(/,
  /popen/i,
  /network/i,
];

export interface ToolCallRequest {
  toolId: AgentToolId;
  args: Record<string, unknown>;
}

export interface ToolCallResult {
  ok: boolean;
  toolId: AgentToolId;
  output: Record<string, unknown>;
  reason: string;
  cancelled: boolean;
  timedOut: boolean;
  durationMs: number;
  auditId: string;
}

export interface AgentToolAuditEntry {
  at: string;
  auditId: string;
  toolId: AgentToolId;
  event: 'request' | 'permission' | 'execute' | 'cancel' | 'timeout' | 'fail' | 'ok';
  detail: string;
  ok: boolean;
}

export interface AgentToolContext {
  sandboxRoot: string;
  readRoot: string;
  waikeRoot: string | null;
  corpusDir: string;
  cancelled: () => boolean;
}

let seq = 0;

export class AllowlistedAgentTools {
  readonly audit: AgentToolAuditEntry[] = [];
  private cancelled = false;
  readonly notebook: SourceGroundedNotebook;

  constructor(private readonly ctx: AgentToolContext) {
    fs.mkdirSync(ctx.sandboxRoot, { recursive: true });
    fs.mkdirSync(ctx.corpusDir, { recursive: true });
    this.notebook = new SourceGroundedNotebook(ctx.readRoot, ctx.corpusDir);
  }

  cancel(): void {
    this.cancelled = true;
    this.audit.push({
      at: new Date().toISOString(),
      auditId: `t-${++seq}`,
      toolId: 'calc.evaluate',
      event: 'cancel',
      detail: 'user_cancel',
      ok: true,
    });
  }

  isCancelled(): boolean {
    return this.cancelled || this.ctx.cancelled();
  }

  catalog(): ToolSchema[] {
    return AGENT_TOOL_CATALOG;
  }

  resolvePath(root: string, rel: string): string {
    const full = path.resolve(root, rel);
    const relToRoot = path.relative(root, full);
    if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
      throw new Error('PATH_ESCAPE');
    }
    return full;
  }

  async execute(
    req: ToolCallRequest,
    granted: Set<AgentToolPermission>,
    timeoutMs?: number,
  ): Promise<ToolCallResult> {
    const t0 = Date.now();
    const auditId = `t-${++seq}-${t0}`;
    const schema = AGENT_TOOL_CATALOG.find((t) => t.id === req.toolId);
    if (!schema) {
      return this.fail(req.toolId, auditId, t0, 'UNKNOWN_TOOL');
    }
    this.audit.push({
      at: new Date().toISOString(),
      auditId,
      toolId: req.toolId,
      event: 'request',
      detail: JSON.stringify(Object.keys(req.args)),
      ok: true,
    });
    if (this.isCancelled()) {
      this.audit.push({
        at: new Date().toISOString(),
        auditId,
        toolId: req.toolId,
        event: 'cancel',
        detail: 'cancelled_before_execute',
        ok: false,
      });
      return {
        ok: false,
        toolId: req.toolId,
        output: {},
        reason: 'CANCELLED',
        cancelled: true,
        timedOut: false,
        durationMs: Date.now() - t0,
        auditId,
      };
    }
    if (!granted.has(schema.permission)) {
      this.audit.push({
        at: new Date().toISOString(),
        auditId,
        toolId: req.toolId,
        event: 'permission',
        detail: `FAIL_CLOSED:${schema.permission}`,
        ok: false,
      });
      return this.fail(req.toolId, auditId, t0, `FAIL_CLOSED:${schema.permission}`);
    }
    this.audit.push({
      at: new Date().toISOString(),
      auditId,
      toolId: req.toolId,
      event: 'permission',
      detail: schema.permission,
      ok: true,
    });
    const limit = timeoutMs ?? schema.timeoutMs;
    try {
      const output = await this.dispatch(req, limit);
      this.audit.push({
        at: new Date().toISOString(),
        auditId,
        toolId: req.toolId,
        event: 'ok',
        detail: 'executed',
        ok: true,
      });
      return {
        ok: true,
        toolId: req.toolId,
        output,
        reason: 'OK',
        cancelled: false,
        timedOut: false,
        durationMs: Date.now() - t0,
        auditId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const timedOut = /TIMEOUT/.test(msg);
      this.audit.push({
        at: new Date().toISOString(),
        auditId,
        toolId: req.toolId,
        event: timedOut ? 'timeout' : 'fail',
        detail: msg,
        ok: false,
      });
      return {
        ok: false,
        toolId: req.toolId,
        output: {},
        reason: msg,
        cancelled: /CANCEL/.test(msg),
        timedOut,
        durationMs: Date.now() - t0,
        auditId,
      };
    }
  }

  private fail(
    toolId: AgentToolId,
    auditId: string,
    t0: number,
    reason: string,
  ): ToolCallResult {
    return {
      ok: false,
      toolId,
      output: {},
      reason,
      cancelled: false,
      timedOut: false,
      durationMs: Date.now() - t0,
      auditId,
    };
  }

  private async dispatch(req: ToolCallRequest, timeoutMs: number): Promise<Record<string, unknown>> {
    if (this.isCancelled()) throw new Error('CANCELLED');
    switch (req.toolId) {
      case 'local.files.read':
        return this.readFile(String(req.args.path ?? ''));
      case 'sandbox.files.write':
        return this.writeSandbox(String(req.args.path ?? ''), String(req.args.content ?? ''));
      case 'source.retrieve':
        return this.retrieve(String(req.args.query ?? ''));
      case 'calc.evaluate':
        return { value: safeEval(String(req.args.expr ?? '')) };
      case 'structured.transform':
        return this.transform(req.args);
      case 'artifact.create':
        return this.artifact(req.args);
      case 'waike.course.query':
        return this.waikeQuery(String(req.args.courseId ?? ''), String(req.args.field ?? 'title'));
      case 'code.sandbox.exec':
        return this.codeSandbox(String(req.args.code ?? ''), timeoutMs);
      default:
        throw new Error('UNKNOWN_TOOL');
    }
  }

  private readFile(rel: string): Record<string, unknown> {
    if (!rel) throw new Error('MISSING_PATH');
    const full = this.resolvePath(this.ctx.readRoot, rel);
    const text = fs.readFileSync(full, 'utf8');
    return { text, bytes: Buffer.byteLength(text), path: rel, sha256: sha(text) };
  }

  private writeSandbox(rel: string, content: string): Record<string, unknown> {
    if (!rel) throw new Error('MISSING_PATH');
    const full = this.resolvePath(this.ctx.sandboxRoot, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return { path: full, bytes: Buffer.byteLength(content), exists: fs.existsSync(full) };
  }

  private retrieve(query: string): Record<string, unknown> {
    const ans = this.notebook.ask(query);
    return {
      grounded: ans.grounded,
      refusedUngrounded: ans.refusedUngrounded,
      answer: ans.answer,
      citations: ans.citations,
    };
  }

  private transform(args: Record<string, unknown>): Record<string, unknown> {
    const op = String(args.op ?? 'count');
    const data = args.data;
    if (op === 'count' && Array.isArray(data)) return { result: data.length };
    if (op === 'pluck' && Array.isArray(data) && typeof args.key === 'string') {
      return { result: data.map((row) => (row as Record<string, unknown>)[args.key as string]) };
    }
    if (op === 'pick' && data && typeof data === 'object' && Array.isArray(args.keys)) {
      const src = data as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const k of args.keys as string[]) result[k] = src[k];
      return { result };
    }
    throw new Error('TRANSFORM_UNSUPPORTED');
  }

  private async artifact(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const kind = args.kind === 'notebook' ? 'notebook' : 'code';
    const assist = new ArtifactAssist(this.ctx.sandboxRoot);
    const r = await assist.fromRequest(kind, String(args.title ?? 'note'), String(args.body ?? ''));
    return { exists: r.exists, kind: r.kind, id: r.record.id };
  }

  private waikeQuery(courseId: string, field: string): Record<string, unknown> {
    if (!this.ctx.waikeRoot) throw new Error('WAIKE_ROOT_ABSENT');
    if (!/^[A-Z0-9_]+$/.test(courseId)) throw new Error('INVALID_COURSE_ID');
    const courseFile = path.join(this.ctx.waikeRoot, 'curriculum', 'digital_rc', courseId, 'course.json');
    const resolved = path.resolve(courseFile);
    if (!resolved.startsWith(path.resolve(this.ctx.waikeRoot))) throw new Error('PATH_ESCAPE');
    if (FORBIDDEN_WAIKE.some((re) => re.test(resolved))) throw new Error('INSTRUCTOR_KEYS_BLOCKED');
    if (!fs.existsSync(resolved)) throw new Error('COURSE_NOT_FOUND');
    const raw = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Record<string, unknown>;
    if (field === 'title') return { courseId, value: raw.title ?? courseId };
    if (field === 'lesson_excerpt') return { courseId, value: raw.lesson_excerpt ?? '' };
    if (field === 'objectives') {
      const objPath = path.join(this.ctx.waikeRoot, 'curriculum', 'digital_rc', courseId, 'learning_objectives.json');
      if (FORBIDDEN_WAIKE.some((re) => re.test(objPath))) throw new Error('INSTRUCTOR_KEYS_BLOCKED');
      if (!fs.existsSync(objPath)) return { courseId, value: raw.learning_objectives ?? [] };
      return { courseId, value: JSON.parse(fs.readFileSync(objPath, 'utf8')) };
    }
    throw new Error('UNKNOWN_FIELD');
  }

  private codeSandbox(code: string, timeoutMs: number): Record<string, unknown> {
    if (FORBIDDEN_CODE.some((re) => re.test(code))) throw new Error('CODE_SANDBOX_REJECTED');
    if (!/^[a-zA-Z0-9_ \t\n+\-*/().,'"=\[\]:#]*$/.test(code) || code.length > 2000) {
      throw new Error('CODE_SANDBOX_REJECTED');
    }
    const cwd = this.ctx.sandboxRoot;
    const r = spawnSync('python3', ['-c', code], {
      cwd,
      encoding: 'utf8',
      timeout: timeoutMs,
      env: { PATH: process.env.PATH ?? '/usr/bin', HOME: cwd, PYTHONDONTWRITEBYTECODE: '1' },
    });
    if (r.error && /TIMEOUT|ETIMEDOUT/i.test(String(r.error))) throw new Error('TIMEOUT');
    if (r.status !== 0) {
      throw new Error(`CODE_SANDBOX_FAIL:${(r.stderr || '').slice(0, 200)}`);
    }
    return { stdout: (r.stdout || '').trim(), exit: r.status, stderr: r.stderr || '' };
  }
}

export interface AgentPlanStep {
  id: string;
  toolId: AgentToolId;
  args: Record<string, unknown>;
  inspect?: string;
}

export interface AgentPlanResult {
  ok: boolean;
  steps: Array<{ step: AgentPlanStep; result: ToolCallResult }>;
  artifactPath: string | null;
  reason: string;
}

/** plan → request tools → permission → execute → inspect → revise → artifact */
export async function runAgentPlan(
  tools: AllowlistedAgentTools,
  granted: Set<AgentToolPermission>,
  goal: string,
  steps: AgentPlanStep[],
): Promise<AgentPlanResult> {
  const ran: AgentPlanResult['steps'] = [];
  for (const step of steps) {
    const result = await tools.execute({ toolId: step.toolId, args: step.args }, granted);
    ran.push({ step, result });
    if (!result.ok) {
      return { ok: false, steps: ran, artifactPath: null, reason: result.reason };
    }
    if (step.inspect && !JSON.stringify(result.output).includes(step.inspect)) {
      return { ok: false, steps: ran, artifactPath: null, reason: `INSPECT_MISS:${step.inspect}` };
    }
  }
  const summary = {
    schema: 'gunnchai.agent_plan_artifact.v1',
    goal,
    at: new Date().toISOString(),
    steps: ran.map((s) => ({
      id: s.step.id,
      toolId: s.step.toolId,
      ok: s.result.ok,
      reason: s.result.reason,
      output: s.result.output,
    })),
  };
  const art = (await tools.execute(
    {
      toolId: 'sandbox.files.write',
      args: { path: 'plan_artifact.json', content: JSON.stringify(summary, null, 2) + '\n' },
    },
    granted,
  )) as ToolCallResult;
  ran.push({
    step: { id: 'artifact', toolId: 'sandbox.files.write', args: { path: 'plan_artifact.json' } },
    result: art,
  });
  return {
    ok: art.ok,
    steps: ran,
    artifactPath: art.ok ? String(art.output.path ?? '') : null,
    reason: art.ok ? 'OK' : art.reason,
  };
}

export function defaultWaikeRoot(): string | null {
  const sibling = path.resolve(process.cwd(), '..', 'waike-research-ops');
  const env = process.env.WAIKE_ROOT;
  const cand = env && fs.existsSync(env) ? env : sibling;
  return fs.existsSync(path.join(cand, 'curriculum', 'digital_rc')) ? cand : null;
}

function safeEval(expr: string): number {
  if (!/^[0-9+\-*/().\s]+$/.test(expr) || expr.length > 80) throw new Error('CALC_REJECTED');
  const tokens = expr.replace(/\s+/g, '');
  let i = 0;
  const peek = () => tokens[i] ?? '';
  const parseExpr = (): number => {
    let v = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[i++]!;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[i++]!;
      const r = parseFactor();
      if (op === '/' && r === 0) throw new Error('DIV_ZERO');
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const parseFactor = (): number => {
    if (peek() === '(') {
      i++;
      const v = parseExpr();
      if (peek() !== ')') throw new Error('CALC_REJECTED');
      i++;
      return v;
    }
    if (peek() === '-') {
      i++;
      return -parseFactor();
    }
    const m = /^\d+(\.\d+)?/.exec(tokens.slice(i));
    if (!m) throw new Error('CALC_REJECTED');
    i += m[0].length;
    return Number(m[0]);
  };
  const v = parseExpr();
  if (i !== tokens.length || !Number.isFinite(v)) throw new Error('CALC_REJECTED');
  return v;
}

function sha(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function tmpToolContext(prefix = 'gunnchai-agent-tools-'): AgentToolContext {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return {
    sandboxRoot: path.join(root, 'sandbox'),
    readRoot: path.join(root, 'read'),
    waikeRoot: defaultWaikeRoot(),
    corpusDir: path.join(root, 'corpus'),
    cancelled: () => false,
  };
}
