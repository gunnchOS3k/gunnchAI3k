/**
 * Selected local inference architecture: llama.cpp (GGUF).
 * Runs real inference when binary + GGUF + memory budget allow;
 * otherwise honest probe + install path + deterministic fallback.
 * Metrics placeholders are used only when no model is available.
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

const MIN_FREE_RAM_MB = 1536;
const DEFAULT_N_PREDICT = 96;
const DEFAULT_CTX = 1024;

export interface LlamaCppProbeDetail extends BackendAvailability {
  architecture: 'llama.cpp';
  ggufPath: string | null;
  freeRamMb: number | null;
  memoryBudgetOk: boolean;
  canRunRealInference: boolean;
  installPathScript: string;
  metricsMode: 'measured' | 'placeholder_no_model';
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
      const pages = free + speculative + Math.floor(inactive / 2);
      return Math.floor((pages * pageSize) / (1024 * 1024));
    }
    const free = os.freemem();
    return Math.floor(free / (1024 * 1024));
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
  const candidates = ['llama-cli', 'llama-server', 'main'];
  for (const c of candidates) {
    const hit = which(c);
    if (hit) return hit;
  }
  const homebrew = [
    '/opt/homebrew/bin/llama-cli',
    '/usr/local/bin/llama-cli',
    '/opt/homebrew/bin/llama-server',
  ];
  for (const p of homebrew) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function buildPrompt(request: InferenceRequest): string {
  return [
    'You are gunnchAI3k local offline assistant.',
    `Capability: ${request.capability}`,
    `Query: ${request.query}`,
    'Respond with concise, actionable local guidance. Do not invent cloud calls.',
  ].join('\n');
}

function runLlamaOnce(
  binary: string,
  gguf: string,
  prompt: string,
): Promise<{ stdout: string; stderr: string; latencyMs: number; rssMb: number | null }> {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const args = [
      '-m',
      gguf,
      '-p',
      prompt,
      '-n',
      String(DEFAULT_N_PREDICT),
      '-c',
      String(DEFAULT_CTX),
      '--temp',
      '0.2',
      '-no-cnv',
    ];
    const child = spawn(binary, args, {
      env: { ...process.env, LLAMA_NO_METAL: process.env.LLAMA_NO_METAL ?? '' },
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('llama.cpp inference timed out after 90s'));
    }, 90_000);

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
        rssMb: null,
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
    const memoryBudgetOk =
      freeRamMb == null ? true : freeRamMb >= MIN_FREE_RAM_MB;
    const canRunRealInference = Boolean(found && gguf && memoryBudgetOk);
    const notes = [
      'SELECTED_ARCHITECTURE=llama.cpp',
      found
        ? `Found llama.cpp-related binary: ${found}`
        : 'No llama.cpp binary discovered (llama-cli/llama-server).',
      gguf
        ? `GGUF present at ${gguf}`
        : 'No usable GGUF (set GUNNCHAI3K_LOCAL_GGUF_PATH or place models/local/*.gguf).',
      freeRamMb == null
        ? 'Free RAM estimate unavailable.'
        : `Estimated reclaimable RAM ~${freeRamMb} MiB (min ${MIN_FREE_RAM_MB} MiB for real run).`,
      memoryBudgetOk
        ? 'Memory budget OK for small GGUF (if binary+weights present).'
        : 'Memory budget insufficient — refusing real load; placeholders only.',
      'Install path: scripts/install-llamacpp-path.sh (no silent weight download).',
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
      memoryBudgetOk,
      canRunRealInference,
      installPathScript: 'scripts/install-llamacpp-path.sh',
      metricsMode: canRunRealInference ? 'measured' : 'placeholder_no_model',
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
      const modelText = run.stdout.trim().slice(0, 4000);
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
        },
        grounded: structuredFallback.grounded,
        sources: structuredFallback.sources,
        latencyMs: run.latencyMs,
        memoryStubBytes: Math.max(
          structuredFallback.memoryStubBytes,
          (availability.freeRamMb ?? 0) * 1024 * 1024,
        ),
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
