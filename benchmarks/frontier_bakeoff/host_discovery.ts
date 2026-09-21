/**
 * Kirby provider bake-off — host capability discovery.
 * Records what is actually present; never assumes models/runtimes are installed.
 */
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';

export interface HostCapabilityBaseline {
  schema: 'kirby.host_capability_baseline.v1';
  captured_at: string;
  host: {
    platform: string;
    os_release: string;
    arch: string;
    hostname_redacted: string;
    memsize_bytes: number;
    memsize_gb: number;
    cpu_brand: string;
    apple_silicon: boolean;
    metal_supported: boolean;
    free_disk_bytes: number;
    free_disk_gb: number;
    hardware_overview: Record<string, string>;
  };
  runtimes: Record<
    string,
    {
      present: boolean;
      version?: string;
      path?: string;
      notes?: string;
    }
  >;
  pixel6a: {
    connected: boolean;
    PIXEL_EDGE_MODEL_BAKEOFF_NOT_RUN: boolean;
    reason: string;
    adb_devices?: string;
  };
  honesty: {
    live_model_inference_attempted: boolean;
    note: string;
  };
}

function sh(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim();
  } catch {
    return '';
  }
}

function which(bin: string): string {
  return sh(`command -v ${bin} 2>/dev/null`);
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

function hardwareOverview(): Record<string, string> {
  const raw = sh('system_profiler SPHardwareDataType');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([^:]+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    // Redact identifiers in committed artifacts
    if (/serial|uuid|udid/i.test(key)) val = '[REDACTED]';
    out[key] = val;
  }
  return out;
}

function metalSupported(): boolean {
  const disp = sh('system_profiler SPDisplaysDataType');
  return /Metal:\s*Supported/i.test(disp);
}

function runtime(name: string, bins: string[], versionCmd?: string): HostCapabilityBaseline['runtimes'][string] {
  for (const b of bins) {
    const p = which(b);
    if (p) {
      const version = versionCmd ? sh(versionCmd) : sh(`${b} --version 2>/dev/null | head -1`);
      return { present: true, path: p, version: version || undefined };
    }
  }
  return { present: false, notes: `Not found on PATH (${bins.join(', ')})` };
}

export function discoverHostCapabilityBaseline(): HostCapabilityBaseline {
  const mem = parseMemsize();
  const free = freeDiskBytes();
  const hw = hardwareOverview();
  const arch = sh('uname -m') || os.arch();
  const sw = sh('sw_vers');
  const adb = sh('adb devices -l 2>/dev/null');
  const pixelConnected = /pixel|6a/i.test(adb) || /\tdevice\b/.test(adb);

  const python = runtime('python', ['python3', 'python'], 'python3 --version');
  const node = runtime('node', ['node'], 'node --version');
  const docker = runtime('docker', ['docker']);
  const podman = runtime('podman', ['podman']);
  const ollama = runtime('ollama', ['ollama']);
  const llamacpp = runtime('llama.cpp', ['llama-cli', 'llama-server', 'llama'], 'llama-cli --version 2>&1 | head -1');
  const mlx = runtime('mlx', ['mlx'], 'python3 -c "import mlx; print(mlx.__version__)" 2>/dev/null');
  const vllm = runtime('vllm', ['vllm'], 'python3 -c "import vllm; print(vllm.__version__)" 2>/dev/null');
  const ort = runtime(
    'onnxruntime',
    ['onnxruntime'],
    'python3 -c "import onnxruntime; print(onnxruntime.__version__)" 2>/dev/null',
  );
  const coreml = (() => {
    const compiler = which('coremlcompiler') || sh('xcrun --find coremlcompiler 2>/dev/null');
    const py = sh('python3 -c "import coremltools; print(coremltools.__version__)" 2>/dev/null');
    if (compiler || py) {
      return {
        present: true,
        path: compiler || undefined,
        version: py || undefined,
        notes: compiler ? 'coremlcompiler present' : 'coremltools python package',
      };
    }
    return { present: false, notes: 'coremlcompiler/coremltools not found' };
  })();

  // MLX check via python if binary missing
  if (!mlx.present) {
    const pyMlx = sh('python3 -c "import mlx; print(mlx.__version__)" 2>/dev/null');
    if (pyMlx) {
      mlx.present = true;
      mlx.version = pyMlx;
      mlx.notes = 'Python package mlx';
    }
  }
  if (!vllm.present) {
    const py = sh('python3 -c "import vllm; print(vllm.__version__)" 2>/dev/null');
    if (py) {
      vllm.present = true;
      vllm.version = py;
    }
  }
  if (!ort.present) {
    const py = sh('python3 -c "import onnxruntime; print(onnxruntime.__version__)" 2>/dev/null');
    if (py) {
      ort.present = true;
      ort.version = py;
    }
  }

  return {
    schema: 'kirby.host_capability_baseline.v1',
    captured_at: new Date().toISOString(),
    host: {
      platform: process.platform,
      os_release: sw || os.release(),
      arch,
      hostname_redacted: os.hostname().replace(/./g, (c, i) => (i < 3 ? c : '*')),
      memsize_bytes: mem,
      memsize_gb: Math.round((mem / (1024 ** 3)) * 10) / 10,
      cpu_brand: hw['Chip'] || hw['Processor Name'] || sh('sysctl -n machdep.cpu.brand_string') || 'unknown',
      apple_silicon: arch === 'arm64' && process.platform === 'darwin',
      metal_supported: metalSupported(),
      free_disk_bytes: free,
      free_disk_gb: Math.round((free / (1024 ** 3)) * 10) / 10,
      hardware_overview: hw,
    },
    runtimes: {
      apple_silicon: { present: arch === 'arm64' && process.platform === 'darwin' },
      metal: { present: metalSupported(), notes: 'From SPDisplaysDataType' },
      python: python,
      node: node,
      docker: docker,
      podman: podman,
      ollama: ollama,
      llama_cpp: llamacpp,
      mlx: mlx,
      vllm: vllm,
      onnxruntime: ort,
      coreml_tools: coreml,
    },
    pixel6a: {
      connected: Boolean(pixelConnected && adb.includes('device')),
      PIXEL_EDGE_MODEL_BAKEOFF_NOT_RUN: true,
      reason: pixelConnected
        ? 'Device listed but no supported Android inference runtime path for bake-off'
        : 'No Pixel 6a / adb device connected; Android inference not installed or tested',
      adb_devices: adb || '(adb missing or empty)',
    },
    honesty: {
      live_model_inference_attempted: false,
      note:
        'Host discovery only. Live weight downloads and remote provider calls are out of scope for offline-required suites. Structural proofs use labeled simulated adapters.',
    },
  };
}

export function writeHostBaseline(dir: string): HostCapabilityBaseline {
  fs.mkdirSync(dir, { recursive: true });
  const baseline = discoverHostCapabilityBaseline();
  const json = JSON.stringify(baseline, null, 2);
  fs.writeFileSync(`${dir}/HOST_CAPABILITY_BASELINE.json`, json);
  fs.writeFileSync(`${dir}/host_baseline.json`, json);
  return baseline;
}
