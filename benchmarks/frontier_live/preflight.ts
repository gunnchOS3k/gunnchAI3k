/**
 * KIRBY-3 live host / Pixel preflight — fail closed; never fabricate.
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { discoverLlamaBinary, discoverLlamaServerBinary } from '../../src/providers/live/llamacpp_provider';

function sh(cmd: string, timeout = 10000): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout }).trim();
  } catch {
    return '';
  }
}

function parseMemsize(): number {
  const raw = sh('sysctl -n hw.memsize');
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return os.totalmem();
}

function freeDiskBytes(): number {
  const out = sh("df -k / | awk 'NR==2{print $4}'");
  const kb = Number(out);
  return Number.isFinite(kb) ? kb * 1024 : 0;
}

function freeRamMb(): number | null {
  try {
    const pageSize = Number(sh('pagesize') || '16384');
    const vm = sh('vm_stat');
    const free = Number(/Pages free:\s+(\d+)/.exec(vm)?.[1] ?? '0');
    const speculative = Number(/Pages speculative:\s+(\d+)/.exec(vm)?.[1] ?? '0');
    const inactive = Number(/Pages inactive:\s+(\d+)/.exec(vm)?.[1] ?? '0');
    const purgeable = Number(/Pages purgeable:\s+(\d+)/.exec(vm)?.[1] ?? '0');
    const pages = free + speculative + Math.floor(inactive * 0.75) + purgeable;
    return Math.floor((pages * pageSize) / (1024 * 1024));
  } catch {
    return Math.floor(os.freemem() / (1024 * 1024));
  }
}

export interface MacBaseline {
  schema: 'kirby.live.mac_baseline.v1';
  captured_at: string;
  host: {
    platform: string;
    arch: string;
    os_release: string;
    memsize_bytes: number;
    memsize_gb: number;
    free_ram_mb: number | null;
    free_disk_bytes: number;
    free_disk_gb: number;
    cpu_brand: string;
    apple_silicon: boolean;
  };
  runtimes: {
    llama_cli: { present: boolean; path?: string; version?: string };
    llama_server: { present: boolean; path?: string };
    adb: { present: boolean; path?: string };
    node: { present: boolean; version?: string };
  };
  honesty: {
    live_model_inference_attempted: boolean;
    note: string;
  };
}

export interface PixelBaseline {
  schema: 'kirby.live.pixel_baseline.v1';
  captured_at: string;
  usb_pixel6a_seen: boolean;
  adb_present: boolean;
  adb_devices_raw: string;
  authorized_device: boolean;
  serial?: string;
  model?: string;
  classification:
    | 'PIXEL_READY'
    | 'PIXEL_ADB_BLOCKED'
    | 'PIXEL_WRONG_OR_MISSING_DEVICE'
    | 'PIXEL_ADB_MISSING';
  owner_approve_steps: string[];
  fail_closed: boolean;
  on_device_inference_possible: boolean;
  notes: string[];
}

export function captureMacBaseline(): MacBaseline {
  const mem = parseMemsize();
  const free = freeDiskBytes();
  const llamaCli = discoverLlamaBinary();
  const llamaServer = discoverLlamaServerBinary();
  const adb = sh('command -v adb');
  const arch = sh('uname -m') || os.arch();
  return {
    schema: 'kirby.live.mac_baseline.v1',
    captured_at: new Date().toISOString(),
    host: {
      platform: process.platform,
      arch,
      os_release: sh('sw_vers') || os.release(),
      memsize_bytes: mem,
      memsize_gb: Math.round((mem / 1024 ** 3) * 10) / 10,
      free_ram_mb: freeRamMb(),
      free_disk_bytes: free,
      free_disk_gb: Math.round((free / 1024 ** 3) * 10) / 10,
      cpu_brand: sh('sysctl -n machdep.cpu.brand_string') || 'unknown',
      apple_silicon: arch === 'arm64' && process.platform === 'darwin',
    },
    runtimes: {
      llama_cli: {
        present: Boolean(llamaCli),
        path: llamaCli || undefined,
        version: llamaCli ? sh(`${llamaCli} --version 2>&1 | head -1`) : undefined,
      },
      llama_server: { present: Boolean(llamaServer), path: llamaServer || undefined },
      adb: { present: Boolean(adb), path: adb || undefined },
      node: { present: true, version: process.version },
    },
    honesty: {
      live_model_inference_attempted: false,
      note: 'Preflight only. Weights download gated by MODEL_PROVENANCE.json.',
    },
  };
}

const OWNER_APPROVE_STEPS = [
  'Unlock Pixel 6a; keep USB-C connected to this Mac.',
  'Settings → Developer options → USB debugging = ON.',
  'Accept the Allow USB debugging? prompt (Allow / Always allow this computer).',
  'If no prompt: USB notification → File transfer / MTP (not Charge only).',
  'On Mac: adb kill-server && adb start-server && adb devices -l',
  'Expect: <serial> device ... model:Pixel_6a (or product:bluejay).',
  'Re-run: npm run bakeoff:kirby-live',
];

export function capturePixelBaseline(): PixelBaseline {
  const adbPath = sh('command -v adb');
  const ioreg = sh('ioreg -p IOUSB -w0 2>/dev/null | grep -i "Pixel 6a" || true');
  const usbSeen = /Pixel 6a/i.test(ioreg) || /Pixel 6a/i.test(sh('system_profiler SPUSBDataType 2>/dev/null | head -200'));
  if (!adbPath) {
    return {
      schema: 'kirby.live.pixel_baseline.v1',
      captured_at: new Date().toISOString(),
      usb_pixel6a_seen: usbSeen,
      adb_present: false,
      adb_devices_raw: '',
      authorized_device: false,
      classification: 'PIXEL_ADB_MISSING',
      owner_approve_steps: ['Install Android platform-tools (adb) via Homebrew: brew install android-platform-tools', ...OWNER_APPROVE_STEPS],
      fail_closed: true,
      on_device_inference_possible: false,
      notes: ['adb binary missing — fail closed for Pixel live paths'],
    };
  }

  sh('adb start-server 2>/dev/null || true');
  const devices = sh('adb devices -l 2>/dev/null');
  const lines = devices
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('List of'));

  const deviceLine = lines.find((l) => /\tdevice\b/.test(l));
  const unauthorized = lines.some((l) => /\tunauthorized\b/.test(l));
  const offline = lines.some((l) => /\toffline\b/.test(l));

  if (deviceLine) {
    const serial = deviceLine.split(/\s+/)[0];
    const model = /model:(\S+)/.exec(deviceLine)?.[1] || sh(`adb -s ${serial} shell getprop ro.product.model 2>/dev/null`);
    const isPixel6a = /pixel.?6a|bluejay/i.test(deviceLine + ' ' + model);
    if (!isPixel6a) {
      return {
        schema: 'kirby.live.pixel_baseline.v1',
        captured_at: new Date().toISOString(),
        usb_pixel6a_seen: usbSeen,
        adb_present: true,
        adb_devices_raw: devices,
        authorized_device: true,
        serial,
        model,
        classification: 'PIXEL_WRONG_OR_MISSING_DEVICE',
        owner_approve_steps: OWNER_APPROVE_STEPS,
        fail_closed: true,
        on_device_inference_possible: false,
        notes: [`Authorized device is not Pixel 6a (model=${model}) — fail closed`],
      };
    }
    return {
      schema: 'kirby.live.pixel_baseline.v1',
      captured_at: new Date().toISOString(),
      usb_pixel6a_seen: true,
      adb_present: true,
      adb_devices_raw: devices,
      authorized_device: true,
      serial,
      model,
      classification: 'PIXEL_READY',
      owner_approve_steps: [],
      fail_closed: false,
      on_device_inference_possible: true,
      notes: ['Pixel 6a authorized via adb'],
    };
  }

  const classification = usbSeen || unauthorized || offline || lines.length === 0 ? 'PIXEL_ADB_BLOCKED' : 'PIXEL_WRONG_OR_MISSING_DEVICE';

  return {
    schema: 'kirby.live.pixel_baseline.v1',
    captured_at: new Date().toISOString(),
    usb_pixel6a_seen: usbSeen,
    adb_present: true,
    adb_devices_raw: devices || '(empty)',
    authorized_device: false,
    classification,
    owner_approve_steps: OWNER_APPROVE_STEPS,
    fail_closed: true,
    on_device_inference_possible: false,
    notes: [
      usbSeen
        ? 'Pixel 6a visible on USB bus but not authorized in adb devices — PIXEL_ADB_BLOCKED'
        : 'No Pixel 6a authorized device in adb — fail closed',
      unauthorized ? 'adb reports unauthorized — accept RSA prompt on device' : '',
    ].filter(Boolean),
  };
}

export function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
