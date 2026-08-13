/**
 * Explicit-share vision/screen. Permission required. No background surveillance.
 * Local-first: inspect user-shared bytes (PNG IHDR / SVG text). Does not invoke OS capture.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PermissionBroker } from '../stage2/os/permissions';

export type ShareKind = 'image' | 'screen';

export interface ExplicitShare {
  kind: ShareKind;
  title?: string;
  filePath?: string;
  buffer?: Buffer;
  claimedAt: string;
}

export interface VisionScreenResult {
  ok: boolean;
  permission: 'granted' | 'denied';
  kind: ShareKind | null;
  format: string | null;
  width: number | null;
  height: number | null;
  labels: string[];
  description: string;
  backgroundCapture: false;
  notes: string;
}

export class VisionScreenRuntime {
  private lastShareAt: string | null = null;
  private captureTimer: NodeJS.Timeout | null = null;

  constructor(private readonly broker = new PermissionBroker()) {}

  grant(userId: string, scope: 'file' | 'camera' | 'screen'): void {
    this.broker.grant(userId, scope);
  }

  revoke(userId: string, scope: 'file' | 'camera' | 'screen'): void {
    this.broker.revoke(userId, scope);
  }

  /** Deliberately unimplemented — background capture is forbidden. */
  startBackgroundCapture(): never {
    throw new Error('BACKGROUND_SURVEILLANCE_FORBIDDEN');
  }

  inspect(userId: string, share: ExplicitShare | null): VisionScreenResult {
    if (!share) {
      return denied('EXPLICIT_SHARE_REQUIRED');
    }
    const scope = share.kind === 'screen' ? 'screen' : 'file';
    const alt = share.kind === 'image' ? 'camera' : 'screen';
    const allowed =
      this.broker.check(userId, scope) === 'granted' ||
      this.broker.check(userId, alt) === 'granted';
    if (!allowed) {
      return denied('PERMISSION_DENIED:no_silent_capture');
    }

    const buf = loadShareBytes(share);
    if (!buf || buf.length === 0) {
      return {
        ok: false,
        permission: 'granted',
        kind: share.kind,
        format: null,
        width: null,
        height: null,
        labels: [],
        description: '',
        backgroundCapture: false,
        notes: 'SHARE_EMPTY',
      };
    }

    const parsed = parseLocalImage(buf, share.filePath);
    this.lastShareAt = share.claimedAt;
    return {
      ok: true,
      permission: 'granted',
      kind: share.kind,
      format: parsed.format,
      width: parsed.width,
      height: parsed.height,
      labels: parsed.labels,
      description: parsed.description,
      backgroundCapture: false,
      notes: 'LOCAL_FIRST_EXPLICIT_SHARE. Not a frontier VLM. OS screencapture was not invoked.',
    };
  }

  getLastShareAt(): string | null {
    return this.lastShareAt;
  }

  hasBackgroundTimer(): boolean {
    return this.captureTimer !== null;
  }
}

function denied(notes: string): VisionScreenResult {
  return {
    ok: false,
    permission: 'denied',
    kind: null,
    format: null,
    width: null,
    height: null,
    labels: [],
    description: '',
    backgroundCapture: false,
    notes,
  };
}

function loadShareBytes(share: ExplicitShare): Buffer | null {
  if (share.buffer && share.buffer.length > 0) return share.buffer;
  if (share.filePath && fs.existsSync(share.filePath)) return fs.readFileSync(share.filePath);
  return null;
}

function parseLocalImage(
  buf: Buffer,
  filePath?: string,
): {
  format: string;
  width: number | null;
  height: number | null;
  labels: string[];
  description: string;
} {
  const labels: string[] = ['local_shared_bytes'];
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    labels.push('png');
    return {
      format: 'png',
      width,
      height,
      labels,
      description: `Shared PNG ${width}x${height}. Local header inspect only.`,
    };
  }
  const asText = buf.toString('utf8');
  if (/<svg[\s>]/i.test(asText)) {
    labels.push('svg');
    const textBits = [...asText.matchAll(/>([^<]{2,})</g)].map((m) => m[1].trim()).filter(Boolean);
    const w = /width=["'](\d+)/i.exec(asText)?.[1];
    const h = /height=["'](\d+)/i.exec(asText)?.[1];
    return {
      format: 'svg',
      width: w ? Number(w) : null,
      height: h ? Number(h) : null,
      labels,
      description: `Shared SVG. Visible text: ${textBits.slice(0, 6).join(' | ') || '(none)'}`,
    };
  }
  const ext = filePath ? path.extname(filePath).slice(1) : 'bin';
  labels.push(ext || 'unknown');
  return {
    format: ext || 'unknown',
    width: null,
    height: null,
    labels,
    description: `Shared ${buf.length} local bytes (${ext || 'unknown'}). No cloud vision API.`,
  };
}
