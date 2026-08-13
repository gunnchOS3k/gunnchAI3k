/**
 * Selected local inference architecture: llama.cpp (GGUF).
 * Continuance IV: runs real inference when binary + GGUF + model-sized
 * memory budget allow; records measured TTFT/tok/s/RSS/context.
 * Metrics placeholders only when no model is available.
 */

import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  BackendAvailability,
  InferenceRequest,
  InferenceResult,
  LocalInferenceBackend,
} from './interface';
import { DeterministicBaselineBackend } from './deterministic';

const DEFAULT_N_PREDICT = 64;
/** Nano-fallback context only. Not a Local Fast/Pro window. */
const DEFAULT_CTX = 512;
/** Absolute floor for tiny GGUF hosts (MiB). */
const ABS_MIN_FREE_RAM_MB = 256;

export interface LlamaRunMetrics {
  promptTokens: number | null;
  outputTokens: number | null;
  promptTokPerSec: number | null;
  generationTokPerSec: number | null;
  /** Approximate time-to-first-token (ms) from prompt eval. */
  ttftMs: number | null;
  peakRssBytes: number | null;
  latencyMs: number;
  contextSize: number;
  nPredict: number;
  hardwarePath: 'cpu' | 'metal' | 'unknown';
  quant: string | null;
  modelPath: string;
  binary: string;
  runtimeVersion: string | null;
}

export interface LlamaCppProbeDetail extends BackendAvailability {
  architecture: 'llama.cpp';
  ggufPath: string | null;
  freeRamMb: number | null;
  memoryBudgetOk: boolean;
  requiredRamMb: number | null;
  canRunRealInference: boolean;
  installPathScript: string;
  metricsMode: 'measured' | 'placeholder_no_model';
  ggufBytes: number | null;
}

function which(bin: string): string | null {
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function estimateFreeRamMb(): number | null {
  try {
    if (process.platform === 'darwin') {
      const pageSize = Number(
        execFileSync('pagesize', { encoding: 'utf8' }).trim(),
      );
      const vm = execFileSync('vm_stat', { encoding: 'utf8' });
      const free = Number(/Pages free:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const speculative = Number(
        /Pages speculative:\s+(\d+)/.exec(vm)?.[1] ?? '0',
      );
      const inactive = Number(/Pages inactive:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const purgeable = Number(/Pages purgeable:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const pages =
        free + speculative + Math.floor(inactive * 0.75) + purgeable;
      return Math.floor((pages * pageSize) / (1024 * 1024));
    }
    return Math.floor(os.freemem() / (1024 * 1024));
  } catch {
    return null;
  }
}

export function discoverGguf(cwd = process.cwd()): string | null {
  const envPath = process.env.GUNNCHAI3K_LOCAL_GGUF_PATH;
  if (envPath && fs.existsSync(envPath)) return path.resolve(envPath);

  const localDir = path.join(cwd, 'models', 'local');
  if (!fs.existsSync(localDir)) return null;
  const files = fs
    .readdirSync(localDir)
    .filter((f) => f.toLowerCase().endsWith('.gguf'))
    .sort();
  if (files.length === 0) return null;
  return path.join(localDir, files[0]);
}

function discoverBinary(): string | null {
  const candidates = ['llama-cli', 'llama-completion', 'llama-server', 'main'];
  for (const c of candidates) {
    const hit = which(c);
    if (hit) return hit;
  }
  const homebrew = [
    '/opt/homebrew/bin/llama-cli',
    '/usr/local/bin/llama-cli',
    '/opt/homebrew/bin/llama-completion',
    '/opt/homebrew/bin/llama-server',
  ];
  for (const p of homebrew) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function runtimeVersion(binary: string): string | null {
  try {
    const out = execFileSync(binary, ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    const m = /version:\s*(\S+)/i.exec(out);
    return m?.[1] ?? out.trim().split('\n')[0]?.slice(0, 80) ?? null;
  } catch {
    return null;
  }
}

/** Required reclaimable RAM ≈ 2.5× GGUF size + 128 MiB overhead, floored. */
export function requiredRamMbForGguf(ggufBytes: number): number {
  const fileMb = Math.ceil(ggufBytes / (1024 * 1024));
  return Math.max(ABS_MIN_FREE_RAM_MB, Math.ceil(fileMb * 2.5) + 128);
}

function inferQuantFromPath(gguf: string): string | null {
  const base = path.basename(gguf);
  const m = /(Q\d+_K(?:_[A-Z]+)?|Q\d+_0|Q\d+_1|IQ\d_\w+|f16|f32)/i.exec(base);
  return m?.[1] ?? null;
}

function buildPrompt(request: InferenceRequest): string {
  const docs =
    request.contextDocs
      ?.slice(0, 3)
      .map((d) => `[${d.id}] ${d.text.slice(0, 240)}`)
      .join('\n') ?? '';
  return [
    'You are gunnchAI3k local offline assistant.',
    `Capability: ${request.capability}`,
    `Query: ${request.query}`,
    docs ? `Local context:\n${docs}` : '',
    'Respond with concise, actionable local guidance. Do not invent cloud calls.',
  ]
    .filter(Boolean)
    .join('\n');
}

function parseLlamaOutput(
  stdout: string,
  stderr: string,
  latencyMs: number,
  peakRssBytes: number | null,
  gguf: string,
  binary: string,
  nPredict: number,
  ctx: number,
  hardwarePath: LlamaRunMetrics['hardwarePath'],
): { text: string; metrics: LlamaRunMetrics } {
  const combined = `${stdout}\n${stderr}`;
  const promptTps = Number(
    /Prompt:\s*([\d.]+)\s*t\/s/i.exec(combined)?.[1] ?? NaN,
  );
  const genTps = Number(
    /Generation:\s*([\d.]+)\s*t\/s/i.exec(combined)?.[1] ?? NaN,
  );
  const promptTokensMatch = /(?:prompt|prompt eval).*?(\d+)\s*tokens?/i.exec(
    combined,
  );
  const outputTokensMatch =
    /(?:eval|generation|predicted).*?(\d+)\s*tokens?/i.exec(combined);

  // Extract assistant response after the echoed "> prompt" line.
  let text = stdout;
  const gt = stdout.lastIndexOf('\n> ');
  if (gt >= 0) {
    text = stdout.slice(gt + 3);
    const firstNl = text.indexOf('\n');
    if (firstNl >= 0) text = text.slice(firstNl + 1);
  }
  text = text
    .replace(/\[ Prompt:[\s\S]*$/i, '')
    .replace(/Exiting\.\.\.[\s\S]*$/i, '')
    .replace(/available commands:[\s\S]*?(?=\n>|\nHello|\nI'm|\nI |\n[A-Z])/i, '')
    .trim();

  // Fallback: take last non-banner block
  if (!text || text.length < 8) {
    const lines = stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !l.startsWith('▄') &&
          !l.startsWith('█') &&
          !l.startsWith('▀') &&
          !l.startsWith('build') &&
          !l.startsWith('model') &&
          !l.startsWith('ftype') &&
          !l.startsWith('modalities') &&
          !l.startsWith('Loading') &&
          !l.startsWith('available') &&
          !l.startsWith('/') &&
          !l.startsWith('>') &&
          !l.startsWith('[ Prompt'),
      );
    text = lines.slice(-6).join('\n').trim();
  }

  const promptTokPerSec = Number.isFinite(promptTps) ? promptTps : null;
  const generationTokPerSec = Number.isFinite(genTps) ? genTps : null;
  const promptTokens = promptTokensMatch
    ? Number(promptTokensMatch[1])
    : null;
  const outputTokens = outputTokensMatch
    ? Number(outputTokensMatch[1])
    : estimateOutputTokens(text);

  let ttftMs: number | null = null;
  if (promptTokPerSec && promptTokens && promptTokens > 0) {
    ttftMs = Math.round((promptTokens / promptTokPerSec) * 1000);
  } else if (promptTokPerSec && promptTokPerSec > 0) {
    // Approximate ~40 prompt tokens for our short system prompt
    ttftMs = Math.round((40 / promptTokPerSec) * 1000);
  }

  return {
    text: text.slice(0, 4000),
    metrics: {
      promptTokens,
      outputTokens,
      promptTokPerSec,
      generationTokPerSec,
      ttftMs,
      peakRssBytes,
      latencyMs,
      contextSize: ctx,
      nPredict,
      hardwarePath,
      quant: inferQuantFromPath(gguf),
      modelPath: gguf,
      binary,
      runtimeVersion: runtimeVersion(binary),
    },
  };
}

function estimateOutputTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words * 1.3));
}

function runLlamaOnce(
  binary: string,
  gguf: string,
  prompt: string,
  opts?: { nPredict?: number; ctx?: number; ngl?: number },
): Promise<{
  stdout: string;
  stderr: string;
  latencyMs: number;
  peakRssBytes: number | null;
  hardwarePath: LlamaRunMetrics['hardwarePath'];
  nPredict: number;
  ctx: number;
}> {
  const nPredict = opts?.nPredict ?? DEFAULT_N_PREDICT;
  const ctx = opts?.ctx ?? DEFAULT_CTX;
  const ngl =
    opts?.ngl ??
    (process.env.GUNNCHAI3K_LLAMA_NGL
      ? Number(process.env.GUNNCHAI3K_LLAMA_NGL)
      : 0);
  const hardwarePath: LlamaRunMetrics['hardwarePath'] =
    ngl > 0 && process.platform === 'darwin' ? 'metal' : 'cpu';

  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const llamaArgs = [
      '-m',
      gguf,
      '-p',
      prompt,
      '-n',
      String(nPredict),
      '-c',
      String(ctx),
      '-ngl',
      String(ngl),
      '--temp',
      '0.2',
      '--no-warmup',
      '-no-cnv',
      '-st',
      '--simple-io',
      '--log-disable',
    ];

    const useTime = process.platform === 'darwin' && fs.existsSync('/usr/bin/time');
    const cmd = useTime ? '/usr/bin/time' : binary;
    const args = useTime ? ['-l', binary, ...llamaArgs] : llamaArgs;

    const child = spawn(cmd, args, {
      env: { ...process.env },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('llama.cpp inference timed out after 120s'));
    }, 120_000);

    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const latencyMs = Math.max(1, Date.now() - t0);
      const rssMatch = /(\d+)\s+maximum resident set size/.exec(stderr);
      const peakRssBytes = rssMatch ? Number(rssMatch[1]) : null;
      if (code !== 0 && !stdout.trim()) {
        reject(
          new Error(
            `llama.cpp exited ${code}: ${stderr.slice(0, 400) || 'no stderr'}`,
          ),
        );
        return;
      }
      resolve({
        stdout,
        stderr,
        latencyMs,
        peakRssBytes,
        hardwarePath,
        nPredict,
        ctx,
      });
    });
  });
}

export class LlamaCppBackend implements LocalInferenceBackend {
  readonly id = 'llama.cpp' as const;
  private readonly fallback = new DeterministicBaselineBackend();
  private readonly cwd: string;

  constructor(cwd = process.cwd()) {
    this.cwd = cwd;
  }

  probe(): LlamaCppProbeDetail {
    const found = discoverBinary();
    const gguf = discoverGguf(this.cwd);
    const freeRamMb = estimateFreeRamMb();
    let ggufBytes: number | null = null;
    let requiredRamMb: number | null = null;
    if (gguf) {
      try {
        ggufBytes = fs.statSync(gguf).size;
        requiredRamMb = requiredRamMbForGguf(ggufBytes);
      } catch {
        ggufBytes = null;
      }
    }
    const memoryBudgetOk =
      freeRamMb == null || requiredRamMb == null
        ? Boolean(found && gguf)
        : freeRamMb >= requiredRamMb;
    // Allow override for CI/dev when operator knows model fits
    const force =
      process.env.GUNNCHAI3K_FORCE_REAL_INFERENCE === '1' ||
      process.env.GUNNCHAI3K_FORCE_REAL_INFERENCE === 'true';
    const canRunRealInference = Boolean(
      found && gguf && (memoryBudgetOk || force),
    );
    const notes = [
      'SELECTED_ARCHITECTURE=llama.cpp',
      found
        ? `Found llama.cpp-related binary: ${found}`
        : 'No llama.cpp binary discovered (llama-cli/llama-server).',
      gguf
        ? `GGUF present at ${gguf}`
        : 'No usable GGUF (set GUNNCHAI3K_LOCAL_GGUF_PATH or place models/local/*.gguf).',
      ggufBytes != null
        ? `GGUF size ~${Math.ceil(ggufBytes / (1024 * 1024))} MiB; required reclaimable RAM ~${requiredRamMb} MiB.`
        : 'GGUF size unknown.',
      freeRamMb == null
        ? 'Free RAM estimate unavailable.'
        : `Estimated reclaimable RAM ~${freeRamMb} MiB.`,
      memoryBudgetOk || force
        ? force && !memoryBudgetOk
          ? 'Memory budget marginal — FORCE_REAL_INFERENCE enabled.'
          : 'Memory budget OK for this GGUF size.'
        : 'Memory budget insufficient — refusing real load; placeholders only.',
      'Install/download: scripts/install-llamacpp-path.sh + scripts/download-small-gguf.sh',
      canRunRealInference
        ? 'Real local inference path ENABLED.'
        : 'Real local inference unavailable; deterministic offline essentials used.',
    ];
    return {
      id: 'llama.cpp',
      architecture: 'llama.cpp',
      available: canRunRealInference,
      installableWithoutAdmin: true,
      notes,
      binaryOrModule: found,
      ggufPath: gguf,
      freeRamMb,
      memoryBudgetOk: memoryBudgetOk || force,
      requiredRamMb,
      canRunRealInference,
      installPathScript: 'scripts/install-llamacpp-path.sh',
      metricsMode: canRunRealInference ? 'measured' : 'placeholder_no_model',
      ggufBytes,
    };
  }

  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const availability = this.probe();
    const structuredFallback = await this.fallback.infer(request);

    if (!availability.canRunRealInference) {
      return {
        ...structuredFallback,
        backend: 'llama.cpp',
        fallbackUsed: true,
        fallbackReason: availability.notes.join(' '),
        isTrainedLlm: false,
        memoryStubBytes: structuredFallback.memoryStubBytes,
        text:
          `[llama.cpp UNAVAILABLE — metrics placeholders; offline deterministic essentials]\n` +
          structuredFallback.text,
        structured: {
          ...structuredFallback.structured,
          selectedArchitecture: 'llama.cpp',
          metricsMode: 'placeholder_no_model',
          realInference: false,
          installPath: availability.installPathScript,
          probeNotes: availability.notes,
        },
      };
    }

    try {
      const prompt = buildPrompt(request);
      const run = await runLlamaOnce(
        availability.binaryOrModule!,
        availability.ggufPath!,
        prompt,
      );
      const parsed = parseLlamaOutput(
        run.stdout,
        run.stderr,
        run.latencyMs,
        run.peakRssBytes,
        availability.ggufPath!,
        availability.binaryOrModule!,
        run.nPredict,
        run.ctx,
        run.hardwarePath,
      );
      const modelText = parsed.text;
      const peakRss =
        parsed.metrics.peakRssBytes ??
        Math.max(
          structuredFallback.memoryStubBytes,
          availability.ggufBytes ?? 0,
        );

      return {
        backend: 'llama.cpp',
        text:
          `[llama.cpp REAL local inference]\n${modelText}\n\n` +
          `[structured overlay]\n${structuredFallback.text}`,
        structured: {
          ...structuredFallback.structured,
          selectedArchitecture: 'llama.cpp',
          metricsMode: 'measured',
          realInference: true,
          modelPath: availability.ggufPath,
          binary: availability.binaryOrModule,
          rawModelChars: modelText.length,
          llmNarrative: modelText,
          llamaMetrics: parsed.metrics,
        },
        grounded: structuredFallback.grounded,
        sources: structuredFallback.sources,
        latencyMs: run.latencyMs,
        memoryStubBytes: peakRss,
        isTrainedLlm: true,
        fallbackUsed: false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ...structuredFallback,
        backend: 'llama.cpp',
        fallbackUsed: true,
        fallbackReason: `llama.cpp real run failed: ${message}`,
        isTrainedLlm: false,
        text:
          `[llama.cpp REAL run FAILED — deterministic fallback]\n${message}\n` +
          structuredFallback.text,
        structured: {
          ...structuredFallback.structured,
          selectedArchitecture: 'llama.cpp',
          metricsMode: 'placeholder_no_model',
          realInference: false,
          failure: message,
        },
      };
    }
  }
}
