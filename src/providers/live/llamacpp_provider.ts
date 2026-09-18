/**
 * Live ModelProviderV2 adapter over llama.cpp CLI/HTTP.
 * llama.cpp schemas stay inside this adapter — control plane sees ModelProviderV2 only.
 */
import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { promisify } from 'node:util';
import type {
  CompletionRequestV2,
  CompletionResultV2,
  ModelProviderV2,
  ModelProviderV2Meta,
} from '../model_provider_v2';

const execFileAsync = promisify(execFile);

export type LiveEvidenceClass = 'LIVE_MAC' | 'LIVE_PIXEL' | 'LIVE_REMOTE' | 'UNAVAILABLE';

export interface LlamaCppProviderOptions {
  meta: ModelProviderV2Meta;
  ggufPath: string;
  binaryPath?: string;
  mode?: 'cli' | 'http';
  serverUrl?: string;
  evidenceClass?: LiveEvidenceClass;
  nPredict?: number;
  ctxSize?: number;
  timeoutMs?: number;
}

function which(bin: string): string | null {
  const homes = ['/opt/homebrew/bin', '/usr/local/bin'];
  for (const h of homes) {
    const p = path.join(h, bin);
    if (fs.existsSync(p)) return p;
  }
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function discoverLlamaBinary(): string | null {
  // Prefer llama-completion for non-interactive generation (newer llama-cli wraps server).
  for (const b of ['llama-completion', 'llama-cli', 'llama']) {
    const hit = which(b);
    if (hit) return hit;
  }
  return null;
}

export function discoverLlamaServerBinary(): string | null {
  return which('llama-server');
}

/** Strip llama.cpp chatter; keep model completion text. */
function extractCompletion(stdout: string): string {
  const lines = stdout
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^\d+\.\d+\.\d+\.\d+\s+[IWE]/.test(l.trim()) &&
        !/^llama_|^system_info:|^sampling:|^generate:|^load_|^print_|^ggml_|^srv |^slot |^common_|^sampler |^\t/i.test(
          l.trim(),
        ) &&
        !/^== Running|^ - Press|^Not using system/i.test(l.trim()),
    );
  const markers = ['\nAssistant:', '\nassistant:', '### Response:', '<|im_start|>assistant'];
  const joined = lines.join('\n');
  for (const m of markers) {
    const idx = joined.lastIndexOf(m);
    if (idx >= 0) {
      return joined.slice(idx + m.length).trim();
    }
  }
  return lines.slice(-12).join('\n').trim() || joined.trim().slice(-500);
}

export class LlamaCppLiveProvider implements ModelProviderV2 {
  readonly meta: ModelProviderV2Meta;
  readonly evidenceClass: LiveEvidenceClass;
  readonly ggufPath: string;
  readonly binaryPath: string;
  readonly mode: 'cli' | 'http';
  readonly serverUrl: string;
  readonly nPredict: number;
  readonly ctxSize: number;
  readonly timeoutMs: number;
  private cancelled = false;

  constructor(opts: LlamaCppProviderOptions) {
    if (!fs.existsSync(opts.ggufPath)) {
      throw new Error(`GGUF missing: ${opts.ggufPath}`);
    }
    const bin = opts.binaryPath || discoverLlamaBinary();
    if (!bin && opts.mode !== 'http') {
      throw new Error('llama-cli not found on PATH');
    }
    this.meta = opts.meta;
    this.ggufPath = path.resolve(opts.ggufPath);
    this.binaryPath = bin || '';
    this.mode = opts.mode ?? 'cli';
    this.serverUrl = opts.serverUrl ?? 'http://127.0.0.1:8080';
    this.evidenceClass = opts.evidenceClass ?? 'LIVE_MAC';
    this.nPredict = opts.nPredict ?? 64;
    this.ctxSize = opts.ctxSize ?? 512;
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  cancel(): void {
    this.cancelled = true;
  }

  resetCancel(): void {
    this.cancelled = false;
  }

  async healthCheck(): Promise<ModelProviderV2Meta['health']> {
    if (!fs.existsSync(this.ggufPath)) return 'down';
    if (this.mode === 'cli' && !this.binaryPath) return 'down';
    if (this.mode === 'http') {
      try {
        await this.httpHealth();
        return 'healthy';
      } catch {
        return 'degraded';
      }
    }
    return 'healthy';
  }

  async complete(req: CompletionRequestV2): Promise<CompletionResultV2> {
    if (this.cancelled) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: 'CANCELLED',
        finish_reason: 'cancelled',
      };
    }
    const budget = req.budget?.max_latency_ms ?? this.timeoutMs;
    if (budget < 1) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: 'TIMEOUT',
        finish_reason: 'timeout',
      };
    }

    try {
      if (this.mode === 'http') {
        return await this.completeHttp(req, budget);
      }
      return await this.completeCli(req, budget);
    } catch (err) {
      return {
        ok: false,
        text: '',
        provider_id: this.meta.provider_id,
        model_id: this.meta.model_id,
        error: err instanceof Error ? err.message : String(err),
        finish_reason: 'error',
      };
    }
  }

  private async completeCli(req: CompletionRequestV2, budgetMs: number): Promise<CompletionResultV2> {
    const system = req.system ?? 'You are a concise local assistant for gunnchAI3k.';
    const prompt = `${system}\n\nUser: ${req.prompt}\nAssistant:`;
    const maxTokens = req.max_tokens ?? this.nPredict;
    const args = [
      '-m',
      this.ggufPath,
      '-p',
      prompt,
      '-n',
      String(maxTokens),
      '-c',
      String(this.ctxSize),
      '--temp',
      '0.2',
      '-ngl',
      '0',
      '--device',
      'none',
      '--fit',
      'off',
      '-t',
      '4',
      '-no-cnv',
      '--no-display-prompt',
    ];
    if (req.structured_schema) {
      // Rebuild prompt to emphasize JSON-only output for reliability trials
      const jsonPrompt = `${system}\n\nUser: ${req.prompt}\nRespond with JSON only using keys: ${Object.keys(req.structured_schema).join(',')}.\nAssistant:`;
      const pIdx = args.indexOf('-p');
      args[pIdx + 1] = jsonPrompt;
    }

    const { stdout, stderr } = await execFileAsync(this.binaryPath, args, {
      timeout: budgetMs,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'utf8',
    });
    // Filter llama.cpp log lines (timestamp prefix like 0.00.xxx)
    const combined = `${stdout || ''}\n${stderr || ''}`;
    const filtered = combined
      .split('\n')
      .filter((l) => !/^\d+\.\d+\.\d+\.\d+\s+[IWE]/.test(l.trim()) && !/^llama_|^common_|^system_info|^sampler |^generate:|^== Running/i.test(l.trim()))
      .join('\n');
    const text = extractCompletion(filtered);
    return {
      ok: text.length > 0,
      text,
      provider_id: this.meta.provider_id,
      model_id: this.meta.model_id,
      usage: {
        input_tokens: Math.ceil(prompt.length / 4),
        output_tokens: Math.ceil(text.length / 4),
      },
      finish_reason: 'stop',
    };
  }

  private async completeHttp(req: CompletionRequestV2, budgetMs: number): Promise<CompletionResultV2> {
    const body = JSON.stringify({
      prompt: req.prompt,
      n_predict: req.max_tokens ?? this.nPredict,
      temperature: 0.2,
      stop: ['</s>', 'User:', 'User :'],
    });
    const url = new URL('/completion', this.serverUrl);
    const text = await new Promise<string>((resolve, reject) => {
      const r = http.request(
        {
          hostname: url.hostname,
          port: url.port || 80,
          path: url.pathname,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
          timeout: budgetMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8');
              const parsed = JSON.parse(raw) as { content?: string };
              resolve(parsed.content ?? raw);
            } catch (e) {
              reject(e);
            }
          });
        },
      );
      r.on('error', reject);
      r.on('timeout', () => {
        r.destroy();
        reject(new Error('TIMEOUT'));
      });
      r.write(body);
      r.end();
    });
    return {
      ok: text.length > 0,
      text,
      provider_id: this.meta.provider_id,
      model_id: this.meta.model_id,
      usage: {
        input_tokens: Math.ceil(req.prompt.length / 4),
        output_tokens: Math.ceil(text.length / 4),
      },
      finish_reason: 'stop',
    };
  }

  private httpHealth(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL('/health', this.serverUrl);
      const r = http.get(
        { hostname: url.hostname, port: url.port || 80, path: url.pathname, timeout: 3000 },
        (res) => {
          res.resume();
          if ((res.statusCode ?? 500) < 500) resolve();
          else reject(new Error(`health ${res.statusCode}`));
        },
      );
      r.on('error', reject);
    });
  }
}

export interface ManagedServer {
  proc: ChildProcess;
  url: string;
  stop: () => void;
}

export function startLlamaServer(opts: {
  ggufPath: string;
  port?: number;
  ctxSize?: number;
}): ManagedServer {
  const bin = discoverLlamaServerBinary();
  if (!bin) throw new Error('llama-server not found');
  const port = opts.port ?? 8765;
  const proc = spawn(
    bin,
    ['-m', opts.ggufPath, '--port', String(port), '-c', String(opts.ctxSize ?? 512), '-ngl', '99'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return {
    proc,
    url: `http://127.0.0.1:${port}`,
    stop: () => {
      try {
        proc.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    },
  };
}
