/**
 * Download-on-demand local GGUF manager.
 * ID, source, license, SHA-256, resume, integrity, quarantine, version, rollback, uninstall, offline.
 * Never treats Nano (135M) as Fast/Pro. Never installs empty or non-GGUF bytes.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';

export const EMPTY_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
export const NANO_SHA256 =
  '2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d';
export const PRO_SHA256 =
  '1adf0b11065d8ad2e8123ea110d1ec956dab4ab038eab665614adba04b6c3370';
export const FAST_SHA256 =
  '2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2';
const GGUF_MAGIC = Buffer.from('GGUF');

export type ModelRole = 'NANO_LOCAL' | 'LOCAL_FAST' | 'LOCAL_PRO';

export interface CatalogEntry {
  id: string;
  role: ModelRole;
  displayName: string;
  version: string;
  license: string;
  source: string;
  ggufSource: string | null;
  downloadUrl: string | null;
  filename: string | null;
  sha256: string | null;
  bytes: number | null;
  quant: string;
  contextTokens: number;
  isNanoFallbackOnly: boolean;
  minBytes: number;
  notes?: string;
}

export interface ManagerState {
  schema: 'gunnchai.model_manager_state.v1';
  installed: Record<
    string,
    {
      id: string;
      version: string;
      filename: string;
      sha256: string;
      bytes: number;
      installedAt: string;
      previousVersion: string | null;
    }
  >;
  quarantined: Array<{ id: string; reason: string; path: string; at: string }>;
}

export interface IntegrityResult {
  ok: boolean;
  reason: string;
  sha256: string | null;
  bytes: number;
  ggufMagic: boolean;
}

export interface EnsureResult {
  ok: boolean;
  id: string;
  role: ModelRole;
  path: string | null;
  sha256: string | null;
  bytes: number;
  offline: boolean;
  downloaded: boolean;
  resumed: boolean;
  quarantined: boolean;
  reason: string;
}

function sha256File(filePath: string): { hash: string; bytes: number } {
  const buf = fs.readFileSync(filePath);
  return { hash: createHash('sha256').update(buf).digest('hex'), bytes: buf.byteLength };
}

function hasGgufMagic(filePath: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  try {
    const head = Buffer.alloc(4);
    const n = fs.readSync(fd, head, 0, 4, 0);
    return n === 4 && head.equals(GGUF_MAGIC);
  } finally {
    fs.closeSync(fd);
  }
}

export function loadCatalog(cwd = process.cwd()): CatalogEntry[] {
  const p = path.join(cwd, 'models', 'local', 'catalog.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as { models: CatalogEntry[] };
  return raw.models;
}

function emptyState(): ManagerState {
  return { schema: 'gunnchai.model_manager_state.v1', installed: {}, quarantined: [] };
}

export class ModelDownloadManager {
  readonly root: string;
  readonly versionsDir: string;
  readonly quarantineDir: string;
  readonly statePath: string;
  readonly catalog: CatalogEntry[];

  constructor(
    private readonly cwd = process.cwd(),
    catalog?: CatalogEntry[],
  ) {
    this.root = path.join(cwd, 'models', 'local');
    this.versionsDir = path.join(this.root, 'versions');
    this.quarantineDir = path.join(this.root, 'quarantine');
    this.statePath = path.join(this.root, 'manager-state.json');
    fs.mkdirSync(this.root, { recursive: true });
    fs.mkdirSync(this.versionsDir, { recursive: true });
    fs.mkdirSync(this.quarantineDir, { recursive: true });
    this.catalog = catalog ?? loadCatalog(cwd);
  }

  loadState(): ManagerState {
    if (!fs.existsSync(this.statePath)) return emptyState();
    return JSON.parse(fs.readFileSync(this.statePath, 'utf8')) as ManagerState;
  }

  saveState(state: ManagerState): void {
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2) + '\n');
  }

  get(id: string): CatalogEntry | undefined {
    return this.catalog.find((m) => m.id === id);
  }

  installedPath(entry: CatalogEntry): string | null {
    if (!entry.filename) return null;
    const current = path.join(this.root, entry.filename);
    if (fs.existsSync(current)) return current;
    const versioned = path.join(this.versionsDir, entry.id, entry.version, entry.filename);
    if (fs.existsSync(versioned)) return versioned;
    return null;
  }

  verifyFile(filePath: string, entry: CatalogEntry): IntegrityResult {
    if (!fs.existsSync(filePath)) {
      return { ok: false, reason: 'ABSENT', sha256: null, bytes: 0, ggufMagic: false };
    }
    const { hash, bytes } = sha256File(filePath);
    if (bytes === 0 || hash === EMPTY_SHA256) {
      return { ok: false, reason: 'EMPTY_FILE_SHA', sha256: hash, bytes, ggufMagic: false };
    }
    const magic = hasGgufMagic(filePath);
    if (!magic) {
      return { ok: false, reason: 'FAKE_MODEL_BYTES_NOT_GGUF', sha256: hash, bytes, ggufMagic: false };
    }
    if (bytes < entry.minBytes) {
      return {
        ok: false,
        reason: `TOO_SMALL_FOR_ROLE:${entry.role}:bytes=${bytes}:min=${entry.minBytes}`,
        sha256: hash,
        bytes,
        ggufMagic: true,
      };
    }
    if (entry.role !== 'NANO_LOCAL' && (hash === NANO_SHA256 || /135m/i.test(path.basename(filePath)))) {
      return {
        ok: false,
        reason: 'NANO_AS_FAST_OR_PRO_REJECTED',
        sha256: hash,
        bytes,
        ggufMagic: true,
      };
    }
    if (entry.role === 'LOCAL_FAST' && entry.id.includes('360') && /135m/i.test(path.basename(filePath))) {
      return { ok: false, reason: 'NANO_AS_FAST_OR_PRO_REJECTED', sha256: hash, bytes, ggufMagic: true };
    }
    if (!entry.sha256) {
      return { ok: false, reason: 'NO_PINNED_SHA256', sha256: hash, bytes, ggufMagic: true };
    }
    if (hash !== entry.sha256) {
      return { ok: false, reason: 'SHA256_MISMATCH', sha256: hash, bytes, ggufMagic: true };
    }
    return { ok: true, reason: 'OK', sha256: hash, bytes, ggufMagic: true };
  }

  quarantine(filePath: string, id: string, reason: string): string {
    const dest = path.join(
      this.quarantineDir,
      `${id}-${Date.now()}-${path.basename(filePath)}`,
    );
    if (fs.existsSync(filePath)) fs.renameSync(filePath, dest);
    const state = this.loadState();
    state.quarantined.push({ id, reason, path: dest, at: new Date().toISOString() });
    this.saveState(state);
    return dest;
  }

  uninstall(id: string): { ok: boolean; reason: string } {
    const entry = this.get(id);
    if (!entry?.filename) return { ok: false, reason: 'UNKNOWN_ID' };
    const current = path.join(this.root, entry.filename);
    if (fs.existsSync(current)) fs.unlinkSync(current);
    const state = this.loadState();
    delete state.installed[id];
    this.saveState(state);
    return { ok: true, reason: 'UNINSTALLED' };
  }

  rollback(id: string): { ok: boolean; reason: string; path: string | null } {
    const entry = this.get(id);
    const state = this.loadState();
    const rec = state.installed[id];
    if (!entry?.filename || !rec?.previousVersion) {
      return { ok: false, reason: 'NO_PREVIOUS_VERSION', path: null };
    }
    const prev = path.join(this.versionsDir, id, rec.previousVersion, entry.filename);
    if (!fs.existsSync(prev)) return { ok: false, reason: 'PREVIOUS_BYTES_ABSENT', path: null };
    const current = path.join(this.root, entry.filename);
    fs.copyFileSync(prev, current);
    state.installed[id] = {
      ...rec,
      version: rec.previousVersion,
      previousVersion: rec.version,
      installedAt: new Date().toISOString(),
    };
    this.saveState(state);
    return { ok: true, reason: 'ROLLED_BACK', path: current };
  }

  async ensure(
    id: string,
    opts: { offline?: boolean; networkConsent?: boolean; timeoutMs?: number } = {},
  ): Promise<EnsureResult> {
    const entry = this.get(id);
    if (!entry) {
      return {
        ok: false,
        id,
        role: 'NANO_LOCAL',
        path: null,
        sha256: null,
        bytes: 0,
        offline: Boolean(opts.offline),
        downloaded: false,
        resumed: false,
        quarantined: false,
        reason: 'UNKNOWN_ID',
      };
    }
    if (entry.role === 'LOCAL_PRO' && !entry.sha256) {
      return {
        ok: false,
        id,
        role: entry.role,
        path: null,
        sha256: null,
        bytes: 0,
        offline: Boolean(opts.offline),
        downloaded: false,
        resumed: false,
        quarantined: false,
        reason: 'LOCAL_PRO_OPEN_NO_PINNED_SHA256',
      };
    }
    const existing = this.installedPath(entry);
    if (existing) {
      const v = this.verifyFile(existing, entry);
      if (v.ok) {
        return {
          ok: true,
          id,
          role: entry.role,
          path: existing,
          sha256: v.sha256,
          bytes: v.bytes,
          offline: Boolean(opts.offline),
          downloaded: false,
          resumed: false,
          quarantined: false,
          reason: 'ALREADY_INSTALLED',
        };
      }
      this.quarantine(existing, id, v.reason);
    }
    if (opts.offline) {
      return {
        ok: false,
        id,
        role: entry.role,
        path: null,
        sha256: null,
        bytes: 0,
        offline: true,
        downloaded: false,
        resumed: false,
        quarantined: false,
        reason: 'OFFLINE_AND_ABSENT',
      };
    }
    if (!opts.networkConsent) {
      return {
        ok: false,
        id,
        role: entry.role,
        path: null,
        sha256: null,
        bytes: 0,
        offline: false,
        downloaded: false,
        resumed: false,
        quarantined: false,
        reason: 'NETWORK_CONSENT_REQUIRED',
      };
    }
    if (!entry.downloadUrl || !entry.filename || !entry.sha256) {
      return {
        ok: false,
        id,
        role: entry.role,
        path: null,
        sha256: null,
        bytes: 0,
        offline: false,
        downloaded: false,
        resumed: false,
        quarantined: false,
        reason: 'NO_DOWNLOAD_SOURCE',
      };
    }
    const dest = path.join(this.root, entry.filename);
    const partial = `${dest}.partial`;
    const dl = await downloadResume(entry.downloadUrl, partial, opts.timeoutMs ?? 600_000);
    const v = this.verifyFile(partial, entry);
    if (!v.ok) {
      const q = this.quarantine(partial, id, v.reason);
      return {
        ok: false,
        id,
        role: entry.role,
        path: q,
        sha256: v.sha256,
        bytes: v.bytes,
        offline: false,
        downloaded: true,
        resumed: dl.resumed,
        quarantined: true,
        reason: v.reason,
      };
    }
    const versionDir = path.join(this.versionsDir, id, entry.version);
    fs.mkdirSync(versionDir, { recursive: true });
    fs.copyFileSync(partial, path.join(versionDir, entry.filename));
    fs.renameSync(partial, dest);
    const state = this.loadState();
    const prev = state.installed[id];
    state.installed[id] = {
      id,
      version: entry.version,
      filename: entry.filename,
      sha256: v.sha256!,
      bytes: v.bytes,
      installedAt: new Date().toISOString(),
      previousVersion: prev?.version ?? null,
    };
    this.saveState(state);
    return {
      ok: true,
      id,
      role: entry.role,
      path: dest,
      sha256: v.sha256,
      bytes: v.bytes,
      offline: false,
      downloaded: true,
      resumed: dl.resumed,
      quarantined: false,
      reason: 'INSTALLED',
    };
  }
}

export function downloadResume(
  url: string,
  destPartial: string,
  timeoutMs: number,
): Promise<{ resumed: boolean; bytes: number }> {
  return new Promise((resolve, reject) => {
    const existing = fs.existsSync(destPartial) ? fs.statSync(destPartial).size : 0;
    const doGet = (target: string, redirects: number) => {
      if (redirects > 8) {
        reject(new Error('TOO_MANY_REDIRECTS'));
        return;
      }
      const u = new URL(target);
      const lib = u.protocol === 'http:' ? http : https;
      const headers: Record<string, string> = { 'User-Agent': 'gunnchAI3k-model-manager/002' };
      if (existing > 0) headers.Range = `bytes=${existing}-`;
      const req = lib.get(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: `${u.pathname}${u.search}`,
          headers,
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            doGet(new URL(res.headers.location, target).toString(), redirects + 1);
            return;
          }
          if (res.statusCode === 416) {
            resolve({ resumed: existing > 0, bytes: existing });
            return;
          }
          if (!res.statusCode || res.statusCode >= 400) {
            reject(new Error(`HTTP_${res.statusCode}`));
            res.resume();
            return;
          }
          const append = res.statusCode === 206 && existing > 0;
          const out = fs.createWriteStream(destPartial, { flags: append ? 'a' : 'w' });
          res.pipe(out);
          out.on('finish', () => {
            const bytes = fs.existsSync(destPartial) ? fs.statSync(destPartial).size : 0;
            resolve({ resumed: append, bytes });
          });
          out.on('error', reject);
        },
      );
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error('DOWNLOAD_TIMEOUT'));
      });
      req.on('error', reject);
    };
    doGet(url, 0);
  });
}
