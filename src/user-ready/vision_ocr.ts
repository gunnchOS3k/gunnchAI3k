/**
 * Local vision stack: OCR (tesseract) + layout/control inference.
 * OCR alone is insufficient for AI-UR-011 COMPLETE — structured regions + task reasoning required.
 * No cloud VLM. No background capture.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface OcrWord {
  text: string;
  conf: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrResult {
  ok: boolean;
  engine: 'tesseract' | 'none';
  text: string;
  words: OcrWord[];
  notes: string;
}

export interface LayoutControl {
  role: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutInference {
  texts: string[];
  objects: string[];
  controls: LayoutControl[];
  scene: string;
  /** True only when OCR produced text AND layout inferred structure beyond a raw dump. */
  beyondOcrOnly: boolean;
  stack: 'ocr_layout_vlm' | 'ocr_only' | 'unavailable';
}

function which(bin: string): string | null {
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function resolveTesseract(): string | null {
  return which('tesseract');
}

/** Run system tesseract OCR on a raster image path. */
export function runTesseractOcr(imagePath: string): OcrResult {
  const bin = resolveTesseract();
  if (!bin) {
    return { ok: false, engine: 'none', text: '', words: [], notes: 'TESSERACT_ABSENT' };
  }
  const tsv = spawnSync(bin, [imagePath, 'stdout', '-l', 'eng', '--psm', '6', 'tsv'], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  if (tsv.status !== 0) {
    const plain = spawnSync(bin, [imagePath, 'stdout', '-l', 'eng', '--psm', '6'], {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    });
    if (plain.status !== 0) {
      return {
        ok: false,
        engine: 'tesseract',
        text: '',
        words: [],
        notes: `TESSERACT_FAILED:${tsv.stderr || plain.stderr || 'exit'}`,
      };
    }
    const text = (plain.stdout || '').trim();
    return {
      ok: text.length > 0,
      engine: 'tesseract',
      text,
      words: text
        .split(/\s+/)
        .filter(Boolean)
        .map((w, i) => ({ text: w, conf: 70, x: i * 40, y: 10, w: 36, h: 16 })),
      notes: 'TESSERACT_PLAIN',
    };
  }
  const lines = (tsv.stdout || '').split(/\r?\n/).slice(1);
  const words: OcrWord[] = [];
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols.length < 12) continue;
    const conf = Number(cols[10]);
    const text = cols[11]?.trim() ?? '';
    if (!text || Number.isNaN(conf) || conf < 0) continue;
    const x = Number(cols[6]);
    const y = Number(cols[7]);
    const w = Number(cols[8]);
    const h = Number(cols[9]);
    words.push({ text, conf, x, y, w, h });
  }
  const text = words.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim();
  return {
    ok: text.length > 0,
    engine: 'tesseract',
    text,
    words,
    notes: 'TESSERACT_TSV',
  };
}

export function ocrBuffer(buf: Buffer, ext = '.png'): OcrResult {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-ocr-'));
  const file = path.join(dir, `share${ext}`);
  try {
    fs.writeFileSync(file, buf);
    return runTesseractOcr(file);
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

const BUTTON_WORDS = /\b(start|next|continue|save|export|fire|pause|play|submit|ok|cancel|close)\b/i;
const ERROR_WORDS = /\b(error|ts\d{4}|exception|failed)\b/i;
const GAME_WORDS = /\b(score|hp|lives|level|ammo|fire|pause)\b/i;
const OFFICE_WORDS = /\b(abstract|report|document|summary|export|memo)\b/i;

/** Infer UI/game/office structure from OCR boxes — not a raw OCR dump. */
export function inferLayoutFromOcr(ocr: OcrResult, width: number, height: number): LayoutInference {
  if (!ocr.ok || !ocr.text.trim()) {
    return {
      texts: [],
      objects: [],
      controls: [],
      scene: '',
      beyondOcrOnly: false,
      stack: 'unavailable',
    };
  }
  const texts = ocr.text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (texts.length === 0) {
    texts.push(ocr.text.slice(0, 240));
  }
  const controls: LayoutControl[] = [];
  for (const w of ocr.words) {
    if (BUTTON_WORDS.test(w.text) && w.conf >= 40) {
      controls.push({
        role: 'button',
        name: w.text,
        x: w.x,
        y: w.y,
        w: Math.max(w.w, 40),
        h: Math.max(w.h, 16),
      });
    }
  }
  // Deduplicate near-identical controls
  const uniq: LayoutControl[] = [];
  for (const c of controls) {
    if (uniq.some((u) => u.name.toLowerCase() === c.name.toLowerCase() && Math.abs(u.x - c.x) < 8)) {
      continue;
    }
    uniq.push(c);
  }

  const objects: string[] = [];
  const joined = ocr.text.toLowerCase();
  if (ERROR_WORDS.test(joined)) objects.push('compiler_diagnostic');
  if (GAME_WORDS.test(joined)) objects.push('game_hud');
  if (OFFICE_WORDS.test(joined)) objects.push('document');
  if (/waike|tutor|lesson/i.test(joined)) objects.push('lesson_card');
  if (uniq.length) objects.push('ui_controls');
  if (objects.length === 0) objects.push('screen_text');

  const beyondOcrOnly =
    uniq.length > 0 ||
    objects.some((o) => o !== 'screen_text') ||
    (texts.length >= 2 && width > 0 && height > 0);

  return {
    texts,
    objects,
    controls: uniq,
    scene: texts.slice(0, 3).join(' | '),
    beyondOcrOnly,
    stack: beyondOcrOnly ? 'ocr_layout_vlm' : 'ocr_only',
  };
}
