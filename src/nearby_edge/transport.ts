import { execFileSync } from 'node:child_process';
import { isFeatureEnabled } from '../config/feature_flags';
import type { TransportMode } from './ProvenanceEnvelope';

export interface TransportPlan {
  mode: TransportMode;
  preferred_for_pixel: boolean;
  adb_reverse_applied: boolean;
  note: string;
}

/** Prefer ADB_REVERSE for Pixel pilot; never claim on-device inference. */
export function planPixelTransport(adbConnected: boolean): TransportPlan {
  if (adbConnected) {
    return {
      mode: 'ADB_REVERSE',
      preferred_for_pixel: true,
      adb_reverse_applied: false,
      note: 'ADB_REVERSE preferred; ADB reverse ≠ on-device inference',
    };
  }
  return {
    mode: 'LOCALHOST',
    preferred_for_pixel: false,
    adb_reverse_applied: false,
    note: 'Pixel ADB unavailable; LOCALHOST only (no unauthenticated LAN)',
  };
}

export function applyAdbReverse(port: number): { ok: boolean; detail: string } {
  if (!isFeatureEnabled('GUNNCHAI_NEARBY_EDGE')) {
    return { ok: false, detail: 'FLAG_OFF' };
  }
  try {
    const serial = process.env.ANDROID_SERIAL;
    const args = serial
      ? ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]
      : ['reverse', `tcp:${port}`, `tcp:${port}`];
    execFileSync('adb', args, { encoding: 'utf8' });
    return { ok: true, detail: `adb reverse tcp:${port} tcp:${port}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export function clearAdbReverse(port: number): void {
  try {
    const serial = process.env.ANDROID_SERIAL;
    const args = serial
      ? ['-s', serial, 'reverse', '--remove', `tcp:${port}`]
      : ['reverse', '--remove', `tcp:${port}`];
    execFileSync('adb', args, { encoding: 'utf8' });
  } catch {
    /* ignore */
  }
}

export function adbDevicesConnected(): boolean {
  return adbDeviceState().connected;
}

export function adbDeviceState(): {
  connected: boolean;
  unauthorized: boolean;
  raw: string;
} {
  try {
    try {
      execFileSync('adb', ['start-server'], { encoding: 'utf8', timeout: 15_000 });
    } catch {
      /* continue */
    }
    const out = execFileSync('adb', ['devices', '-l'], { encoding: 'utf8', timeout: 15_000 });
    return {
      connected: /^[0-9A-Za-z]+\s+device\b/m.test(out),
      unauthorized: /\bunauthorized\b/m.test(out),
      raw: out,
    };
  } catch (err) {
    return {
      connected: false,
      unauthorized: false,
      raw: err instanceof Error ? err.message : String(err),
    };
  }
}
