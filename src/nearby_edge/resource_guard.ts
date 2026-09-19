/**
 * 8GB Mac resource guard for nearby-edge / controlled micro inference.
 * Uses free + inactive + purgeable pages — raw "Pages free" alone under-counts on macOS.
 */
import { execFileSync } from 'node:child_process';

export interface ResourceSnapshot {
  memsize_gb: number;
  free_mb: number;
  available_mb: number;
  pressure: 'ok' | 'elevated' | 'critical';
  allow_micro: boolean;
  allow_360m: boolean;
  note: string;
}

function parseVmPages(vm: string, label: string): number {
  const re = new RegExp(`Pages ${label}:\\s+(\\d+)`);
  const m = re.exec(vm);
  return m ? Number(m[1]) : 0;
}

export function captureResourceSnapshot(): ResourceSnapshot {
  let memsize_gb = 8;
  let free_mb = 1024;
  let available_mb = 1024;
  try {
    const memsize = Number(execFileSync('sysctl', ['-n', 'hw.memsize'], { encoding: 'utf8' }).trim());
    memsize_gb = Math.round(memsize / (1024 ** 3));
  } catch {
    /* keep default */
  }
  try {
    const vm = execFileSync('vm_stat', { encoding: 'utf8' });
    const pageSizeMatch = /page size of (\d+)/.exec(vm);
    const ps = pageSizeMatch ? Number(pageSizeMatch[1]) : 16384;
    const free = parseVmPages(vm, 'free');
    const speculative = parseVmPages(vm, 'speculative');
    const inactive = parseVmPages(vm, 'inactive');
    const purgeable = parseVmPages(vm, 'purgeable');
    free_mb = Math.round(((free + speculative) * ps) / (1024 * 1024));
    available_mb = Math.round(((free + speculative + inactive + purgeable) * ps) / (1024 * 1024));
  } catch {
    /* keep default */
  }

  // Micro (135M Q4) is small; allow on 8GB class unless available is tiny.
  let pressure: ResourceSnapshot['pressure'] = 'ok';
  if (available_mb < 250) pressure = 'critical';
  else if (available_mb < 700) pressure = 'elevated';

  const allow_micro = memsize_gb >= 8 && pressure !== 'critical';
  const allow_360m = memsize_gb >= 16 && available_mb > 2500;

  return {
    memsize_gb,
    free_mb,
    available_mb,
    pressure,
    allow_micro,
    allow_360m,
    note: 'M2/8GB class: micro allowed unless available_mb critical; skip 360M on 8GB',
  };
}
