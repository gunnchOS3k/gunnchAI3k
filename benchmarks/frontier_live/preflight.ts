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

export interface PixelOnDeviceRuntimeProbe {
  termux: boolean;
  llama_cli: boolean;
  llama_server: boolean;
  ollama: boolean;
  gguf_on_device: boolean;
  matching_packages: string[];
  note: string;
}

export interface PixelBaseline {
  schema: 'kirby.live.pixel_baseline.v1';
  captured_at: string;
  PIXEL6A_ADB_CONNECTED: boolean;
  usb_pixel6a_seen: boolean;
  adb_present: boolean;
  adb_devices_raw: string;
  authorized_device: boolean;
  serial?: string;
  model?: string;
  product_device?: string;
  classification:
    | 'PIXEL_READY'
    | 'PIXEL_ADB_BLOCKED'
    | 'PIXEL_WRONG_OR_MISSING_DEVICE'
    | 'PIXEL_ADB_MISSING';
  owner_approve_steps: string[];
  fail_closed: boolean;
  /** True only when ADB connected AND an on-device inference runtime is present. */
  on_device_inference_possible: boolean;
  props?: Record<string, string>;
  meminfo?: Record<string, string>;
  storage?: string;
  battery?: Record<string, string>;
  thermal?: {
    status: string;
    skin_c?: number;
    battery_c?: number;
    excerpt: string;
  };
  on_device_runtime?: PixelOnDeviceRuntimeProbe;
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

function adbShell(serial: string, cmd: string, timeout = 12000): string {
  return sh(`adb -s ${serial} shell ${cmd}`, timeout);
}

function probeOnDeviceRuntime(serial: string): PixelOnDeviceRuntimeProbe {
  const packages = adbShell(
    serial,
    `"pm list packages 2>/dev/null | grep -iE 'termux|llama|ollama|mlc|executorch|mediapipe|onnxruntime|gunnchai' || true"`,
  )
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const whichBins = adbShell(serial, `"which llama-cli llama-server ollama 2>/dev/null || true"`);
  const gguf = adbShell(
    serial,
    `"ls /data/local/tmp/*.gguf /sdcard/Download/*.gguf /sdcard/*.gguf 2>/dev/null || true"`,
  );
  const termux = packages.some((p) => /termux/i.test(p));
  const llama_cli = /llama-cli/.test(whichBins) || packages.some((p) => /llama/i.test(p));
  const llama_server = /llama-server/.test(whichBins);
  const ollama = /ollama/.test(whichBins) || packages.some((p) => /ollama/i.test(p));
  const gguf_on_device = /\.gguf/i.test(gguf);
  return {
    termux,
    llama_cli,
    llama_server,
    ollama,
    gguf_on_device,
    matching_packages: packages.slice(0, 40),
    note:
      termux || llama_cli || llama_server || ollama || gguf_on_device
        ? 'Partial on-device assets detected — still require a verified inference path before LIVE_PIXEL claims'
        : 'No Termux/llama.cpp/ollama/GGUF on-device runtime found — PIXEL6A_LIVE_LOCAL_MODEL_PASS stays false',
  };
}

function capturePixelSuite(serial: string): Pick<
  PixelBaseline,
  'props' | 'meminfo' | 'storage' | 'battery' | 'thermal' | 'on_device_runtime' | 'product_device'
> {
  const propKeys = [
    'ro.product.model',
    'ro.product.device',
    'ro.product.name',
    'ro.build.version.release',
    'ro.build.version.sdk',
    'ro.product.cpu.abi',
    'ro.hardware',
    'ro.board.platform',
  ];
  const props: Record<string, string> = {};
  for (const k of propKeys) {
    props[k] = adbShell(serial, `getprop ${k}`);
  }
  const memRaw = adbShell(serial, `"cat /proc/meminfo | head -8"`);
  const meminfo: Record<string, string> = {};
  for (const line of memRaw.split('\n')) {
    const m = line.match(/^(\w+):\s+(\d+)/);
    if (m) meminfo[m[1]] = m[2];
  }
  const storage = adbShell(serial, `"df -h /data /sdcard 2>/dev/null | head -10"`);
  const battRaw = adbShell(serial, `"dumpsys battery | head -30"`);
  const battery: Record<string, string> = {};
  for (const line of battRaw.split('\n')) {
    const m = line.trim().match(/^([^:]+):\s*(.+)$/);
    if (m) battery[m[1].trim()] = m[2].trim();
  }
  const thermalRaw = adbShell(serial, `"dumpsys thermalservice 2>/dev/null | head -60"`);
  const statusMatch = /Thermal Status:\s*(\d+)/.exec(thermalRaw);
  const skinMatch = /VIRTUAL-SKIN[^}]*mValue=([0-9.]+)/.exec(thermalRaw);
  const battTherm = /mName=battery,\s*mStatus=\d+\}|Temperature\{mValue=([0-9.]+)[^}]*mName=battery/.exec(
    thermalRaw,
  );
  const batteryTempFromDumpsys = Number(battery['temperature']);
  return {
    product_device: props['ro.product.device'] || undefined,
    props,
    meminfo,
    storage,
    battery,
    thermal: {
      status: statusMatch?.[1] ?? 'unknown',
      skin_c: skinMatch ? Number(skinMatch[1]) : undefined,
      battery_c: Number.isFinite(batteryTempFromDumpsys) ? batteryTempFromDumpsys / 10 : undefined,
      excerpt: thermalRaw.slice(0, 1800),
    },
    on_device_runtime: probeOnDeviceRuntime(serial),
  };
}

export function capturePixelBaseline(): PixelBaseline {
  const adbPath = sh('command -v adb');
  const ioreg = sh('ioreg -p IOUSB -w0 2>/dev/null | grep -i "Pixel 6a" || true');
  const usbSeen = /Pixel 6a/i.test(ioreg) || /Pixel 6a/i.test(sh('system_profiler SPUSBDataType 2>/dev/null | head -200'));
  if (!adbPath) {
    return {
      schema: 'kirby.live.pixel_baseline.v1',
      captured_at: new Date().toISOString(),
      PIXEL6A_ADB_CONNECTED: false,
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

  const deviceLine = lines.find((l) => /\s+device\b/.test(l) && !/\soffline\b/.test(l) && !/\sunauthorized\b/.test(l));
  const unauthorized = lines.some((l) => /\sunauthorized\b/.test(l));
  const offline = lines.some((l) => /\soffline\b/.test(l));

  if (deviceLine) {
    const serial = deviceLine.split(/\s+/)[0];
    const model = /model:(\S+)/.exec(deviceLine)?.[1] || sh(`adb -s ${serial} shell getprop ro.product.model 2>/dev/null`);
    const isPixel6a = /pixel.?6a|bluejay/i.test(deviceLine + ' ' + model);
    if (!isPixel6a) {
      return {
        schema: 'kirby.live.pixel_baseline.v1',
        captured_at: new Date().toISOString(),
        PIXEL6A_ADB_CONNECTED: false,
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
    const suite = capturePixelSuite(serial);
    const runtime = suite.on_device_runtime!;
    const runtimePresent =
      runtime.llama_cli || runtime.llama_server || runtime.ollama || (runtime.termux && runtime.gguf_on_device);
    return {
      schema: 'kirby.live.pixel_baseline.v1',
      captured_at: new Date().toISOString(),
      PIXEL6A_ADB_CONNECTED: true,
      usb_pixel6a_seen: true,
      adb_present: true,
      adb_devices_raw: devices,
      authorized_device: true,
      serial,
      model,
      classification: 'PIXEL_READY',
      owner_approve_steps: [],
      fail_closed: false,
      on_device_inference_possible: runtimePresent,
      ...suite,
      notes: [
        'Pixel 6a authorized via adb — PIXEL6A_ADB_CONNECTED=true',
        'Prior PIXEL_ADB_BLOCKED classification cleared',
        runtime.note,
        runtimePresent
          ? 'On-device runtime present — live local model gate may be attempted'
          : 'ADB connected does not equal on-device inference — no genuine local model runtime',
      ],
    };
  }

  const classification = usbSeen || unauthorized || offline || lines.length === 0 ? 'PIXEL_ADB_BLOCKED' : 'PIXEL_WRONG_OR_MISSING_DEVICE';

  return {
    schema: 'kirby.live.pixel_baseline.v1',
    captured_at: new Date().toISOString(),
    PIXEL6A_ADB_CONNECTED: false,
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
