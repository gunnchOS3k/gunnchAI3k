/**
 * Local Pro re-audit for AI-USER-READY-004.
 * Never fake HOST_OBSERVED. Prefer LOCAL_PRO_RESOURCE_PENDING when download/inference
 * would contend with Product-Use QEMU / low free RAM/disk.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ModelDownloadManager, PRO_SHA256 } from './model_manager';
import { runLocalProDirect, type ProRuntimeReport } from './local_pro_runtime';

export type LocalProAuditStatus =
  | 'HOST_OBSERVED'
  | 'LOCAL_PRO_RESOURCE_PENDING'
  | 'OPEN'
  | 'ABSENT'
  | 'SHA_MISMATCH';

export interface LocalProAudit {
  status: LocalProAuditStatus;
  sha256: string | null;
  bytes: number;
  path: string | null;
  freeMemBytes: number;
  freeDiskBytes: number;
  resourceSafe: boolean;
  notes: string;
  observation: string | null;
  proReport: ProRuntimeReport | null;
}

const PRO_BYTES = 986_048_768;
/** Keep ~2.5× model size free before download+inference under shared-host pressure. */
const MIN_FREE_DISK = PRO_BYTES * 2.5;
const MIN_FREE_MEM = 2 * 1024 * 1024 * 1024; // 2 GiB

function freeDiskBytes(dir: string): number {
  try {
    const st = fs.statfsSync(dir);
    return Number(st.bavail) * Number(st.bsize);
  } catch {
    return 0;
  }
}

export async function auditLocalPro(
  cwd = process.cwd(),
  opts?: { networkConsent?: boolean; forceDownload?: boolean },
): Promise<LocalProAudit> {
  const freeMemBytes = os.freemem();
  const freeDisk = freeDiskBytes(cwd);
  const mgr = new ModelDownloadManager(cwd);
  const ensureOffline = await mgr.ensure('local-pro-qwen2_5-1_5b', {
    networkConsent: false,
    offline: true,
  });

  if (ensureOffline.ok && ensureOffline.sha256 === PRO_SHA256 && ensureOffline.path) {
    const pro = await runLocalProDirect(cwd, { networkConsent: false, offline: true });
    if (pro.ok && pro.observation === 'HOST_OBSERVED') {
      return {
        status: 'HOST_OBSERVED',
        sha256: pro.sha256,
        bytes: pro.bytes,
        path: pro.modelPath,
        freeMemBytes,
        freeDiskBytes: freeDisk,
        resourceSafe: true,
        notes: 'Local Pro hashed GGUF present; real llama.cpp inference HOST_OBSERVED.',
        observation: 'HOST_OBSERVED',
        proReport: pro,
      };
    }
    return {
      status: 'OPEN',
      sha256: ensureOffline.sha256,
      bytes: ensureOffline.bytes,
      path: ensureOffline.path,
      freeMemBytes,
      freeDiskBytes: freeDisk,
      resourceSafe: true,
      notes: pro.notes || 'PRO_WEIGHTS_PRESENT_BUT_INFERENCE_FAILED',
      observation: null,
      proReport: pro,
    };
  }

  const resourceSafe = freeMemBytes >= MIN_FREE_MEM && freeDisk >= MIN_FREE_DISK;

  // Explicit resource gate: under contention, do not download ~1GB Pro weights.
  // forceDownload is ignored when resources are unsafe (honesty > speed).
  if (
    !resourceSafe ||
    process.env.GUNNCHAI_SKIP_PRO_DOWNLOAD === '1' ||
    !opts?.networkConsent
  ) {
    const status: LocalProAuditStatus = 'LOCAL_PRO_RESOURCE_PENDING';
    const outDir = path.join(cwd, 'benchmarks');
    fs.mkdirSync(outDir, { recursive: true });
    const payload = {
      schema: 'gunnchai.local_pro_status.v1',
      packet: 'AI-USER-READY-004',
      status,
      candidate: 'Qwen/Qwen2.5-1.5B-Instruct',
      license: 'Apache-2.0',
      pinned_sha256: PRO_SHA256,
      expected_bytes: PRO_BYTES,
      freeMemBytes,
      freeDiskBytes: freeDisk,
      resourceSafe,
      host_observed_inference: false,
      notes:
        'LOCAL_PRO_RESOURCE_PENDING: weights absent and/or host memory/disk unsafe for ~1GB download+inference while Product-Use may be active. No fake HOST_OBSERVED.',
      HUMAN_E6: false,
      FRONTIER_PARITY: false,
    };
    fs.writeFileSync(path.join(outDir, 'LOCAL_PRO_STATUS.json'), JSON.stringify(payload, null, 2) + '\n');
    return {
      status,
      sha256: ensureOffline.sha256,
      bytes: ensureOffline.bytes,
      path: ensureOffline.path,
      freeMemBytes,
      freeDiskBytes: freeDisk,
      resourceSafe,
      notes: payload.notes,
      observation: null,
      proReport: null,
    };
  }

  // Resources look safe + consent — attempt real download/inference (rare on shared lab hosts).
  const pro = await runLocalProDirect(cwd, {
    networkConsent: true,
    offline: false,
  });
  const status: LocalProAuditStatus = pro.ok
    ? 'HOST_OBSERVED'
    : ensureOffline.bytes > 0
      ? 'SHA_MISMATCH'
      : 'OPEN';
  return {
    status,
    sha256: pro.sha256,
    bytes: pro.bytes,
    path: pro.modelPath,
    freeMemBytes,
    freeDiskBytes: freeDisk,
    resourceSafe: true,
    notes: pro.notes,
    observation: pro.ok ? pro.observation : null,
    proReport: pro,
  };
}
