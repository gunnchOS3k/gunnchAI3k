/**
 * Legal / provenance gate before any weight download.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export interface ProvenanceCandidate {
  candidate_id: string;
  display_name: string;
  parameters: string;
  quant: string;
  license: string;
  license_ok: boolean;
  source_model_card: string;
  gguf_repo: string;
  download_url: string;
  filename: string;
  expected_sha256: string;
  expected_bytes: number;
  target_hosts: Array<'mac_8gb' | 'pixel6a_micro'>;
  fits_mac_8gb: boolean;
  fits_pixel_micro: boolean;
  notes: string;
}

/** Only Apache-2.0 / MIT / BSD-style open licenses allowed for live download. */
export const LIVE_CANDIDATES: ProvenanceCandidate[] = [
  {
    candidate_id: 'live-smollm2-135m-q4_k_m',
    display_name: 'SmolLM2-135M-Instruct Q4_K_M',
    parameters: '135M',
    quant: 'Q4_K_M',
    license: 'Apache-2.0',
    license_ok: true,
    source_model_card: 'https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct',
    gguf_repo: 'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF',
    download_url:
      'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf',
    filename: 'SmolLM2-135M-Instruct-Q4_K_M.gguf',
    expected_sha256: '2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d',
    expected_bytes: 105454432,
    target_hosts: ['mac_8gb', 'pixel6a_micro'],
    fits_mac_8gb: true,
    fits_pixel_micro: true,
    notes: 'Nano/micro router candidate. Apache-2.0. ~101 MiB. Not a 7B+ Pixel load.',
  },
  {
    candidate_id: 'live-smollm2-360m-q4_k_m',
    display_name: 'SmolLM2-360M-Instruct Q4_K_M',
    parameters: '360M',
    quant: 'Q4_K_M',
    license: 'Apache-2.0',
    license_ok: true,
    source_model_card: 'https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct',
    gguf_repo: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF',
    download_url:
      'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf',
    filename: 'SmolLM2-360M-Instruct-Q4_K_M.gguf',
    expected_sha256: '2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2',
    expected_bytes: 270590880,
    target_hosts: ['mac_8gb'],
    fits_mac_8gb: true,
    fits_pixel_micro: false,
    notes: 'Optional Mac local-assistant rung if RAM/disk allow. Too large for Pixel micro policy.',
  },
];

export interface ModelProvenanceDoc {
  schema: 'kirby.live.model_provenance.v1';
  captured_at: string;
  policy: {
    unknown_license_weights_forbidden: true;
    seven_b_plus_on_pixel_forbidden: true;
    download_requires_license_ok: true;
  };
  candidates: ProvenanceCandidate[];
  approved_for_download: string[];
  rejected: Array<{ candidate_id: string; reason: string }>;
}

export function buildProvenanceDoc(): ModelProvenanceDoc {
  const approved: string[] = [];
  const rejected: Array<{ candidate_id: string; reason: string }> = [];
  for (const c of LIVE_CANDIDATES) {
    if (!c.license_ok || !c.license || /unknown|proprietary|all.?rights/i.test(c.license)) {
      rejected.push({ candidate_id: c.candidate_id, reason: 'license not approved' });
      continue;
    }
    if (!c.expected_sha256 || c.expected_sha256.length < 64) {
      rejected.push({ candidate_id: c.candidate_id, reason: 'missing pinned sha256' });
      continue;
    }
    approved.push(c.candidate_id);
  }
  return {
    schema: 'kirby.live.model_provenance.v1',
    captured_at: new Date().toISOString(),
    policy: {
      unknown_license_weights_forbidden: true,
      seven_b_plus_on_pixel_forbidden: true,
      download_requires_license_ok: true,
    },
    candidates: LIVE_CANDIDATES,
    approved_for_download: approved,
    rejected,
  };
}

export function sha256File(file: string): string {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

export function ensureApprovedGguf(
  repoRoot: string,
  candidateId: string,
  opts: { networkConsent: boolean; maxBytesFreeRequired?: number } = { networkConsent: false },
): { ok: boolean; path?: string; detail: string } {
  const doc = buildProvenanceDoc();
  if (!doc.approved_for_download.includes(candidateId)) {
    return { ok: false, detail: `candidate ${candidateId} not approved in provenance gate` };
  }
  const c = LIVE_CANDIDATES.find((x) => x.candidate_id === candidateId)!;
  const destDir = path.join(repoRoot, 'models/local');
  fs.mkdirSync(destDir, { recursive: true });
  const out = path.join(destDir, c.filename);

  // Resolve symlink targets for sha check
  const resolveExisting = (p: string): string | null => {
    if (!fs.existsSync(p)) return null;
    try {
      return fs.realpathSync(p);
    } catch {
      return p;
    }
  };

  // Also accept sibling main-repo models/local (shared host cache) via symlink
  const sibling = path.resolve(repoRoot, '../../models/local', c.filename);
  const siblingMain = path.resolve(repoRoot, '../../../gunnchAI3k/models/local', c.filename);
  for (const candidatePath of [out, sibling, siblingMain, path.join(path.dirname(repoRoot), 'models/local', c.filename)]) {
    const existing = resolveExisting(candidatePath);
    if (!existing) continue;
    try {
      const actual = sha256File(existing);
      if (actual === c.expected_sha256) {
        if (path.resolve(existing) !== path.resolve(out) && !fs.existsSync(out)) {
          try {
            fs.symlinkSync(existing, out);
          } catch {
            /* ignore — may already exist */
          }
        }
        return { ok: true, path: fs.existsSync(out) ? out : existing, detail: `verified existing weights at ${existing}` };
      }
    } catch {
      /* continue */
    }
  }

  if (fs.existsSync(out)) {
    const actual = sha256File(fs.realpathSync(out));
    if (actual === c.expected_sha256) {
      return { ok: true, path: out, detail: 'already present; sha256 match' };
    }
    fs.unlinkSync(out);
  }
  if (!opts.networkConsent) {
    return { ok: false, detail: 'networkConsent=false — refusing download' };
  }
  try {
    execFileSync('curl', ['-L', '--fail', '--retry', '3', '--retry-delay', '2', '-A', 'gunnchAI3k-kirby-live/1.0', '-o', out, c.download_url], {
      stdio: 'inherit',
      timeout: 600_000,
    });
  } catch (e) {
    return { ok: false, detail: `download failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  const actual = sha256File(out);
  if (actual !== c.expected_sha256) {
    fs.unlinkSync(out);
    return { ok: false, detail: `sha256 mismatch actual=${actual}` };
  }
  return { ok: true, path: out, detail: 'downloaded and verified' };
}
