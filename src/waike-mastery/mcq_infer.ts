/**
 * Lean MCQ inference for Mastery-002 — short prompt, small n_predict, no structured overlay.
 * Does not touch REAL_SOLVER_BASELINE_V1 settings; used only for post-baseline runtime runs.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { discoverGguf } from '../system-layer/local_inference/backends/llamacpp';

function whichLlama(): string | null {
  const candidates = [
    '/opt/homebrew/bin/llama-cli',
    '/usr/local/bin/llama-cli',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    return execFileSync('which', ['llama-cli'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

export interface LeanMcqResult {
  text: string;
  latency_ms: number;
  model: string | null;
  binary: string | null;
  n_predict: number;
  ctx: number;
  ok: boolean;
  detail: string;
}

/**
 * Direct llama-cli MCQ call. Temperature 0; n_predict small so SmolLM finishes with a letter.
 */
export function leanMcqInfer(opts: {
  cwd: string;
  prompt: string;
  ggufPath?: string | null;
  nPredict?: number;
  ctx?: number;
  timeoutMs?: number;
}): LeanMcqResult {
  const binary = whichLlama();
  const gguf = opts.ggufPath || discoverGguf(opts.cwd);
  const nPredict = opts.nPredict ?? Number(process.env.GUNNCHAI_MCQ_N_PREDICT || 12);
  const ctx = opts.ctx ?? Number(process.env.GUNNCHAI_MCQ_CTX || 384);
  const timeoutMs = opts.timeoutMs ?? 90_000;

  if (!binary || !gguf) {
    return {
      text: '',
      latency_ms: 0,
      model: gguf,
      binary,
      n_predict: nPredict,
      ctx,
      ok: false,
      detail: !binary ? 'no_llama_binary' : 'no_gguf',
    };
  }

  const t0 = Date.now();
  const r = spawnSync(
    binary,
    [
      '-m',
      gguf,
      '-p',
      opts.prompt,
      '-n',
      String(nPredict),
      '-c',
      String(ctx),
      '-ngl',
      process.env.GUNNCHAI3K_LLAMA_NGL || '0',
      '--temp',
      '0',
      '-no-cnv',
      '-st',
      '--simple-io',
    ],
    { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
  );
  const latency = Date.now() - t0;
  if (r.error) {
    return {
      text: '',
      latency_ms: latency,
      model: gguf,
      binary,
      n_predict: nPredict,
      ctx,
      ok: false,
      detail: r.error.message,
    };
  }
  let text = (r.stdout || '').trim();
  // Prefer generation after the echoed Final: cue (banner + prompt echo precede it).
  const finalIdx = text.lastIndexOf('Final:');
  if (finalIdx >= 0) {
    const after = text.slice(finalIdx + 'Final:'.length).trim();
    // Drop trailing llama metrics banners
    const cleaned = after
      .split('\n')
      .filter((l) => l && !/^\[ Prompt:/i.test(l) && !/^Exiting/i.test(l) && !/^Generation:/i.test(l))
      .join('\n')
      .trim();
    if (cleaned) text = cleaned;
  }
  // SmolLM often emits "B) <choice text>" as the whole answer; normalize for parser v2.
  const loneOpt = /^\s*([A-Da-d])\)\s*.+$/m.exec(text);
  if (loneOpt && !/Final\s*:/i.test(text)) {
    text = `Final: ${loneOpt[1].toUpperCase()}`;
  } else if (loneOpt && text.trim().split(/\n/).length <= 2) {
    text = `Final: ${loneOpt[1].toUpperCase()}`;
  }
  return {
    text,
    latency_ms: latency,
    model: gguf,
    binary,
    n_predict: nPredict,
    ctx,
    ok: r.status === 0 || text.length > 0,
    detail: r.status === 0 ? 'ok' : `exit_${r.status}`,
  };
}

export function buildLeanMcqPrompt(opts: {
  stem: string;
  choices: string[];
  lessonExcerpt?: string;
  toolNote?: string;
}): string {
  const letters = opts.choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join('\n');
  const parts = [
    'Multiple-choice. Reply with ONE letter only: A, B, C, or D.',
    'Do not explain. Final answer format: Final: <letter>',
  ];
  if (opts.lessonExcerpt) {
    parts.push(`Lesson notes:\n${opts.lessonExcerpt.slice(0, 600)}`);
  }
  if (opts.toolNote) {
    parts.push(`Tool result (compute only; pick matching choice):\n${opts.toolNote}`);
  }
  parts.push(`Question: ${opts.stem}`);
  parts.push(letters);
  parts.push('Final:');
  return parts.join('\n');
}

/** Prefer frozen baseline model path when present under models/local. */
export function resolveMasteryGguf(cwd: string): string | null {
  const preferred = path.join(cwd, 'models', 'local', 'SmolLM2-135M-Instruct-Q4_K_M.gguf');
  if (fs.existsSync(preferred)) return preferred;
  return discoverGguf(cwd);
}
