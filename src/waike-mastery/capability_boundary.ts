/**
 * Model capability boundary for Mastery-002.
 * Compare already-available local GGUFs without large downloads.
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseFinalChoice } from './choice_parser';

export interface ModelCard {
  id: string;
  path: string;
  architecture: string;
  params: string;
  quant: string | null;
  bytes: number;
  file_hash: string;
}

function hashFile(p: string): string {
  return createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export function listAvailableLocalModels(cwd: string): ModelCard[] {
  const dir = path.join(cwd, 'models', 'local');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.gguf'))
    .sort()
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      const quant = /Q\d+[_A-Z0-9]*/i.exec(f)?.[0] || null;
      let params = 'unknown';
      let architecture = 'gguf';
      if (/135M/i.test(f)) params = '135M';
      if (/360M/i.test(f)) params = '360M';
      if (/SmolLM2/i.test(f)) architecture = 'SmolLM2';
      return {
        id: f.replace(/\.gguf$/i, ''),
        path: p,
        architecture,
        params,
        quant,
        bytes: st.size,
        file_hash: hashFile(p),
      };
    });
}

function whichLlama(): string | null {
  try {
    return execFileSync('which', ['llama-cli'], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

function quickInfer(binary: string, model: string, prompt: string): { text: string; tok_per_sec: number | null } {
  const r = spawnSync(
    binary,
    [
      '-m',
      model,
      '-p',
      prompt,
      '-n',
      '16',
      '-c',
      '256',
      '--temp',
      '0',
      '-no-cnv',
    ],
    { encoding: 'utf8', timeout: 120_000 },
  );
  const text = (r.stdout || '') + (r.stderr || '');
  const tps = /([\d.]+)\s*tokens\s*per\s*second/i.exec(text);
  // Prefer generation section after prompt
  const out = r.stdout || '';
  return { text: out.slice(-400), tok_per_sec: tps ? Number(tps[1]) : null };
}

function estimateFreeRamMb(): number {
  try {
    if (process.platform === 'darwin') {
      const pageSize = Number(execFileSync('pagesize', { encoding: 'utf8' }).trim());
      const vm = execFileSync('vm_stat', { encoding: 'utf8' });
      const free = Number(/Pages free:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const speculative = Number(/Pages speculative:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const inactive = Number(/Pages inactive:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const purgeable = Number(/Pages purgeable:\s+(\d+)/.exec(vm)?.[1] ?? '0');
      const pages = free + speculative + Math.floor(inactive * 0.75) + purgeable;
      return Math.floor((pages * pageSize) / (1024 * 1024));
    }
  } catch {
    /* fall through */
  }
  return Math.floor(os.freemem() / (1024 * 1024));
}

export function runCapabilityBoundary(cwd = process.cwd()): Record<string, unknown> {
  const models = listAvailableLocalModels(cwd);
  const binary = whichLlama();
  const freeMb = estimateFreeRamMb();
  const totalMb = Math.floor(os.totalmem() / (1024 * 1024));

  const probePrompt =
    'Reply with a single letter (A/B/C/D) only.\nQuestion: 2+2?\nA) 3\nB) 4\nC) 5\nD) 6\nFinal:';

  const comparisons: Array<Record<string, unknown>> = [];
  // Only compare already-present models; skip huge downloads
  for (const m of models.slice(0, 2)) {
    if (!binary) {
      comparisons.push({
        model: m.id,
        status: 'BLOCKED_NO_BINARY',
        ...m,
      });
      continue;
    }
    const needMb = Math.ceil(m.bytes / (1024 * 1024)) + 256;
    // Allow tiny already-local models unless free RAM is critically low
    if (freeMb < 64) {
      comparisons.push({
        model: m.id,
        status: 'BLOCKED_RESOURCE',
        detail: `free_ram_mb=${freeMb}`,
        ...m,
      });
      continue;
    }
    try {
      const inf = quickInfer(binary, m.path, probePrompt);
      const parsed = parseFinalChoice(inf.text, 4);
      comparisons.push({
        model: m.id,
        status: 'OK',
        architecture: m.architecture,
        params: m.params,
        quant: m.quant,
        context: 256,
        memory_mb_file: Math.ceil(m.bytes / (1024 * 1024)),
        tokens_per_sec: inf.tok_per_sec,
        probe_choice: parsed.letter,
        probe_ok: parsed.letter === 'B',
        file_hash: m.file_hash,
        required_ram_heuristic_mb: needMb,
      });
    } catch (err) {
      comparisons.push({
        model: m.id,
        status: 'ERROR',
        detail: err instanceof Error ? err.message : String(err),
        ...m,
      });
    }
  }

  const weak =
    comparisons.length > 0 &&
    comparisons.every((c) => c.probe_ok !== true) &&
    comparisons.some((c) => c.status === 'OK');

  const out = {
    schema: 'gunnchai.model_capability_boundary.v1',
    hardware: {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      total_mem_mb: totalMb,
      free_mem_mb: freeMb,
    },
    llama_binary: binary,
    models_available: models.map((m) => ({
      id: m.id,
      params: m.params,
      quant: m.quant,
      bytes: m.bytes,
      file_hash: m.file_hash,
    })),
    comparisons,
    MODEL_A_vs_MODEL_B:
      comparisons.length >= 2
        ? {
            MODEL_A: comparisons[0],
            MODEL_B: comparisons[1],
          }
        : null,
    MODEL_CAPABILITY_LIMIT: weak,
    claim_boundary:
      'Local already-available GGUF comparison only. No large downloads while Product-Use/QEMU may own resources. ' +
      'Weak probe accuracy may indicate MODEL_CAPABILITY_LIMIT for curriculum mastery.',
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'MODEL_CAPABILITY_BOUNDARY.json'),
    JSON.stringify(out, null, 2) + '\n',
  );
  return out;
}
