/**
 * Local Pro inference: hashed Qwen2.5-1.5B GGUF + llama.cpp + real output.
 * Download-on-demand with SHA-256. Never relabel Fast/Nano as Pro.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  FAST_SHA256,
  ModelDownloadManager,
  NANO_SHA256,
  type EnsureResult,
} from './model_manager';

export const PRO_SHA256 =
  '1adf0b11065d8ad2e8123ea110d1ec956dab4ab038eab665614adba04b6c3370';

export type ObservationClass = 'HOST_OBSERVED' | 'GUEST_OBSERVED';

export interface ProCaseResult {
  id: string;
  prompt: string;
  output: string;
  latencyMs: number | null;
  realInference: boolean;
  usedNano: boolean;
  usedFastAsPro: boolean;
}

export interface ProRuntimeReport {
  ok: boolean;
  role: 'LOCAL_PRO';
  modelId: string;
  modelPath: string | null;
  sha256: string | null;
  bytes: number;
  license: string;
  llamaBinary: string | null;
  observation: ObservationClass;
  ensure: EnsureResult;
  cases: ProCaseResult[];
  notes: string;
  weightsStatus: 'PRESENT' | 'OPEN' | 'ABSENT';
}

const PRO_CASES = [
  {
    id: 'general',
    prompt: 'In one short sentence, what is OFDM used for in wireless links?',
  },
  {
    id: 'structured',
    prompt: 'Return only JSON with keys ok (boolean true) and tier (string "pro").',
  },
  {
    id: 'waike',
    prompt: 'In one sentence, how should a local tutor help without dumping exam answers?',
  },
];

function which(bin: string): string | null {
  try {
    return execFileSync('which', [bin], { encoding: 'utf8' }).trim() || null;
  } catch {
    return null;
  }
}

function resolveLlama(): string | null {
  return which('llama-cli') || which('llama');
}

function runLlama(bin: string, model: string, prompt: string): { output: string; latencyMs: number } {
  const started = Date.now();
  const out = execFileSync(
    bin,
    [
      '-m',
      model,
      '-p',
      prompt,
      '-n',
      '48',
      '--temp',
      '0.2',
      '-ngl',
      '0',
      '--no-display-prompt',
    ],
    { encoding: 'utf8', timeout: 120_000, maxBuffer: 2 * 1024 * 1024 },
  );
  return { output: out.trim(), latencyMs: Date.now() - started };
}

export async function runLocalProDirect(
  cwd = process.cwd(),
  opts?: { networkConsent?: boolean; offline?: boolean },
): Promise<ProRuntimeReport> {
  const mgr = new ModelDownloadManager(cwd);
  const ensure = await mgr.ensure('local-pro-qwen2_5-1_5b', {
    networkConsent: opts?.networkConsent ?? false,
    offline: opts?.offline ?? false,
    timeoutMs: 900_000,
  });
  const llama = resolveLlama();
  const observation: ObservationClass = 'HOST_OBSERVED';

  if (!ensure.ok || !ensure.path || ensure.sha256 !== PRO_SHA256) {
    return {
      ok: false,
      role: 'LOCAL_PRO',
      modelId: 'local-pro-qwen2_5-1_5b',
      modelPath: ensure.path,
      sha256: ensure.sha256,
      bytes: ensure.bytes,
      license: 'Apache-2.0',
      llamaBinary: llama,
      observation,
      ensure,
      cases: [],
      weightsStatus: ensure.reason.includes('OPEN') || ensure.reason.includes('NO_PINNED')
        ? 'OPEN'
        : 'ABSENT',
      notes: `LOCAL_PRO_UNAVAILABLE:${ensure.reason}`,
    };
  }

  if (!llama) {
    return {
      ok: false,
      role: 'LOCAL_PRO',
      modelId: 'local-pro-qwen2_5-1_5b',
      modelPath: ensure.path,
      sha256: ensure.sha256,
      bytes: ensure.bytes,
      license: 'Apache-2.0',
      llamaBinary: null,
      observation,
      ensure,
      cases: [],
      weightsStatus: 'PRESENT',
      notes: 'LLAMA_CLI_ABSENT',
    };
  }

  if (ensure.sha256 === NANO_SHA256 || ensure.sha256 === FAST_SHA256) {
    return {
      ok: false,
      role: 'LOCAL_PRO',
      modelId: 'local-pro-qwen2_5-1_5b',
      modelPath: ensure.path,
      sha256: ensure.sha256,
      bytes: ensure.bytes,
      license: 'Apache-2.0',
      llamaBinary: llama,
      observation,
      ensure,
      cases: [],
      weightsStatus: 'ABSENT',
      notes: 'NANO_OR_FAST_AS_PRO_REJECTED',
    };
  }

  const cases: ProCaseResult[] = [];
  for (const c of PRO_CASES) {
    try {
      const { output, latencyMs } = runLlama(llama, ensure.path, c.prompt);
      cases.push({
        id: c.id,
        prompt: c.prompt,
        output,
        latencyMs,
        realInference: output.trim().length > 4,
        usedNano: false,
        usedFastAsPro: false,
      });
    } catch (err) {
      cases.push({
        id: c.id,
        prompt: c.prompt,
        output: err instanceof Error ? err.message : String(err),
        latencyMs: null,
        realInference: false,
        usedNano: false,
        usedFastAsPro: false,
      });
    }
  }

  const ok = cases.length === PRO_CASES.length && cases.every((c) => c.realInference);
  const gatePath = path.join(cwd, 'benchmarks', 'LOCAL_PRO_QUALITY_GATE.json');
  const gate = {
    schema: 'gunnchai.local_pro_quality_gate.v1',
    packet: 'AI-USER-READY-003',
    role: 'LOCAL_PRO',
    modelId: 'local-pro-qwen2_5-1_5b',
    sha256: ensure.sha256,
    bytes: ensure.bytes,
    license: 'Apache-2.0',
    observation,
    ok,
    cases: cases.map((c) => ({
      id: c.id,
      realInference: c.realInference,
      latencyMs: c.latencyMs,
      output_excerpt: c.output.slice(0, 180),
    })),
    notes: ok
      ? 'HOST_OBSERVED Local Pro inference on hashed Qwen2.5-1.5B Q4_K_M. Not a frontier quality claim.'
      : 'Local Pro present but inference cases incomplete.',
  };
  fs.mkdirSync(path.dirname(gatePath), { recursive: true });
  fs.writeFileSync(gatePath, JSON.stringify(gate, null, 2) + '\n');

  return {
    ok,
    role: 'LOCAL_PRO',
    modelId: 'local-pro-qwen2_5-1_5b',
    modelPath: ensure.path,
    sha256: ensure.sha256,
    bytes: ensure.bytes,
    license: 'Apache-2.0',
    llamaBinary: llama,
    observation,
    ensure,
    cases,
    weightsStatus: 'PRESENT',
    notes: ok
      ? 'Local Pro HOST_OBSERVED: hashed GGUF + real llama inference. Not frontier parity.'
      : 'Local Pro bytes present but quality cases failed.',
  };
}
