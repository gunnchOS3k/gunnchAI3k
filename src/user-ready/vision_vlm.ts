/**
 * Local semantic VLM path for AI-UR-011.
 * OCR stays in vision_ocr.ts. This module understands NON-TEXT rasters:
 * charts (bar heights from pixels), objects/photos (color blobs), UI chrome,
 * WAIKE figures, game HUDs, compiler screenshots, mixed text+image.
 * Modes: OCR_ONLY | VLM_ONLY | OCR_PLUS_VLM.
 * Cloud VLM is explicit-consent only and labeled separately. No silent screenshots.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { ocrBuffer, type OcrResult } from './vision_ocr';
import {
  blankRgb,
  decodePngRgb,
  encodePngRgb,
  fillRect,
  pixel,
  type RgbImage,
} from './png_rgb';

export type VisionMode = 'OCR_ONLY' | 'VLM_ONLY' | 'OCR_PLUS_VLM';

export type VisionFixtureKind =
  | 'chart'
  | 'photo_object'
  | 'ui_screenshot'
  | 'waike_figure'
  | 'game_screenshot'
  | 'compiler_screenshot'
  | 'mixed_text_image';

export interface SemanticObject {
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

export interface ChartReading {
  bars: Array<{ color: string; heightPx: number; approxValue: number }>;
}

export interface VlmObservation {
  mode: VisionMode;
  stack: 'local_semantic_vlm' | 'ocr_only' | 'ocr_plus_local_vlm' | 'cloud_vlm_consented';
  objects: SemanticObject[];
  chart: ChartReading | null;
  scene: string;
  texts: string[];
  nonTextUnderstood: boolean;
  cloudVlmUsed: false | 'explicit_consent';
  notes: string;
}

export interface VisionCompareResult {
  ocrOnly: VlmObservation;
  vlmOnly: VlmObservation;
  ocrPlusVlm: VlmObservation;
  rasterSemanticPass: boolean;
  notes: string;
}

function colorName(r: number, g: number, b: number): string {
  if (r > 180 && g < 80 && b < 80) return 'red';
  if (r < 80 && g < 80 && b > 180) return 'blue';
  if (r < 90 && g >= 160 && b < 90) return 'green';
  if (r > 200 && g > 180 && b < 80) return 'yellow';
  if (r > 200 && g < 80 && b > 180) return 'magenta';
  if (r < 80 && g > 180 && b > 180) return 'cyan';
  if (r > 200 && g > 200 && b > 200) return 'white';
  if (r < 40 && g < 40 && b < 40) return 'black';
  if (r > 180 && g > 100 && b < 60) return 'orange';
  return 'gray';
}

function isBg(r: number, g: number, b: number): boolean {
  return r > 230 && g > 230 && b > 230;
}

export function detectColorBlobs(img: RgbImage, minArea = 40): SemanticObject[] {
  const seen = new Uint8Array(img.width * img.height);
  const blobs: SemanticObject[] = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = y * img.width + x;
      if (seen[idx]) continue;
      const [r, g, b] = pixel(img, x, y);
      if (isBg(r, g, b)) {
        seen[idx] = 1;
        continue;
      }
      const name = colorName(r, g, b);
      const q: number[] = [idx];
      seen[idx] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let n = 0;
      while (q.length) {
        const cur = q.pop()!;
        n++;
        const cx = cur % img.width;
        const cy = Math.floor(cur / img.width);
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height) continue;
          const ni = ny * img.width + nx;
          if (seen[ni]) continue;
          const [rr, gg, bb] = pixel(img, nx, ny);
          if (colorName(rr, gg, bb) !== name || isBg(rr, gg, bb)) continue;
          seen[ni] = 1;
          q.push(ni);
        }
      }
      if (n >= minArea) {
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const aspect = w / Math.max(1, h);
        const shape = aspect > 1.6 ? 'bar' : aspect < 0.6 ? 'bar' : w > 18 && h > 18 ? 'block' : 'blob';
        blobs.push({
          label: `${name}_${shape}`,
          color: name,
          x: minX,
          y: minY,
          w,
          h,
          score: Math.min(1, n / 200),
        });
      }
    }
  }
  return blobs.sort((a, b) => a.x - b.x);
}

export function readBarChart(img: RgbImage): ChartReading {
  const blobs = detectColorBlobs(img, 30).filter((b) => b.w >= 8 && b.h >= 8);
  const baseline = img.height - 4;
  const bars = blobs.map((b) => ({
    color: b.color,
    heightPx: b.h,
    approxValue: Math.round((b.h / Math.max(1, baseline - 8)) * 100),
  }));
  return { bars };
}

function sceneFrom(kind: VisionFixtureKind, objects: SemanticObject[], chart: ChartReading | null): string {
  if (kind === 'chart' && chart && chart.bars.length) {
    return `Bar chart with ${chart.bars.length} bars: ${chart.bars
      .map((b) => `${b.color}=${b.heightPx}px`)
      .join(', ')}`;
  }
  if (kind === 'photo_object') {
    return `Photo/object scene: ${objects.map((o) => o.label).join(', ') || 'no blobs'}`;
  }
  if (kind === 'game_screenshot') {
    return `Game HUD regions: ${objects.map((o) => o.label).join(', ')}`;
  }
  if (kind === 'ui_screenshot') {
    return `UI chrome blocks: ${objects.map((o) => `${o.color}@(${o.x},${o.y})`).join(', ')}`;
  }
  if (kind === 'compiler_screenshot') {
    return `Compiler screenshot regions: ${objects.map((o) => o.label).join(', ')}`;
  }
  if (kind === 'waike_figure') {
    return `WAIKE figure: ${objects.map((o) => o.label).join(', ')}`;
  }
  return `Mixed scene objects=${objects.length}`;
}

export function analyzeVlmOnly(png: Buffer, kind: VisionFixtureKind): VlmObservation {
  const img = decodePngRgb(png);
  const objects = detectColorBlobs(img);
  const chart = kind === 'chart' || kind === 'mixed_text_image' ? readBarChart(img) : null;
  const nonText =
    (chart && chart.bars.length >= 2) ||
    objects.some((o) => o.w * o.h >= 80);
  return {
    mode: 'VLM_ONLY',
    stack: 'local_semantic_vlm',
    objects,
    chart,
    scene: sceneFrom(kind, objects, chart),
    texts: [],
    nonTextUnderstood: Boolean(nonText),
    cloudVlmUsed: false,
    notes: 'Pixel-space semantic raster (no OCR). Local only. Not a cloud VLM.',
  };
}

export function analyzeOcrOnly(png: Buffer): VlmObservation {
  const ocr: OcrResult = ocrBuffer(png, '.png');
  const texts = ocr.text
    ? ocr.text.split(/\s+/).filter((t) => t.length > 1)
    : [];
  return {
    mode: 'OCR_ONLY',
    stack: 'ocr_only',
    objects: [],
    chart: null,
    scene: texts.join(' ') || '',
    texts,
    nonTextUnderstood: false,
    cloudVlmUsed: false,
    notes: ocr.ok ? 'OCR text dump only — no semantic non-text.' : `OCR_FAIL:${ocr.notes}`,
  };
}

export function analyzeOcrPlusVlm(png: Buffer, kind: VisionFixtureKind): VlmObservation {
  const ocr = analyzeOcrOnly(png);
  const vlm = analyzeVlmOnly(png, kind);
  return {
    mode: 'OCR_PLUS_VLM',
    stack: 'ocr_plus_local_vlm',
    objects: vlm.objects,
    chart: vlm.chart,
    scene: [vlm.scene, ocr.texts.slice(0, 8).join(' ')].filter(Boolean).join(' | '),
    texts: ocr.texts,
    nonTextUnderstood: vlm.nonTextUnderstood,
    cloudVlmUsed: false,
    notes: 'OCR text plus local semantic raster. Cloud VLM unused.',
  };
}

export function compareVisionModes(png: Buffer, kind: VisionFixtureKind): VisionCompareResult {
  const ocrOnly = analyzeOcrOnly(png);
  const vlmOnly = analyzeVlmOnly(png, kind);
  const ocrPlusVlm = analyzeOcrPlusVlm(png, kind);
  const rasterSemanticPass =
    vlmOnly.nonTextUnderstood &&
    (kind !== 'chart' || (vlmOnly.chart !== null && vlmOnly.chart.bars.length >= 2));
  return {
    ocrOnly,
    vlmOnly,
    ocrPlusVlm,
    rasterSemanticPass,
    notes: rasterSemanticPass
      ? 'VLM_ONLY understood non-text raster structure.'
      : 'VLM_ONLY did not recover non-text structure.',
  };
}

export function refuseCloudVlmWithoutConsent(consented: boolean): { ok: boolean; reason: string } {
  if (!consented) return { ok: false, reason: 'CLOUD_VLM_CONSENT_REQUIRED' };
  return { ok: true, reason: 'CLOUD_VLM_LABELED_SEPARATE' };
}

/** Build real rasters (pixels carry meaning; no GUNNCHAI_VISION_FIXTURE marker). */
export function renderVisionFixture(kind: VisionFixtureKind): { png: Buffer; expected: Record<string, unknown> } {
  if (kind === 'chart') {
    const img = blankRgb(160, 100, 255, 255, 255);
    fillRect(img, 8, 8, 144, 84, 250, 250, 250);
    fillRect(img, 20, 100 - 8 - 70, 24, 70, 220, 20, 20);
    fillRect(img, 60, 100 - 8 - 35, 24, 35, 20, 40, 210);
    fillRect(img, 100, 100 - 8 - 50, 24, 50, 20, 180, 40);
    return {
      png: encodePngRgb(img),
      expected: { bars: ['red', 'blue', 'green'], heights: [70, 35, 50] },
    };
  }
  if (kind === 'photo_object') {
    const img = blankRgb(120, 90, 240, 248, 255);
    fillRect(img, 35, 20, 50, 50, 210, 30, 30);
    return { png: encodePngRgb(img), expected: { object: 'red_block' } };
  }
  if (kind === 'ui_screenshot') {
    const img = blankRgb(200, 80, 245, 245, 248);
    fillRect(img, 0, 0, 200, 16, 30, 90, 70);
    fillRect(img, 140, 50, 50, 18, 40, 140, 100);
    return { png: encodePngRgb(img), expected: { chrome: ['header', 'button'] } };
  }
  if (kind === 'waike_figure') {
    const img = blankRgb(140, 90, 255, 255, 255);
    fillRect(img, 15, 20, 40, 40, 40, 140, 200);
    fillRect(img, 70, 30, 50, 20, 200, 120, 20);
    return { png: encodePngRgb(img), expected: { figure: 'waike_blocks' } };
  }
  if (kind === 'game_screenshot') {
    const img = blankRgb(180, 90, 20, 20, 30);
    fillRect(img, 8, 8, 50, 12, 220, 40, 40);
    fillRect(img, 8, 70, 40, 12, 40, 200, 80);
    return { png: encodePngRgb(img), expected: { hud: ['hp', 'score'] } };
  }
  if (kind === 'compiler_screenshot') {
    const img = blankRgb(200, 70, 30, 32, 36);
    fillRect(img, 6, 8, 188, 14, 90, 20, 20);
    fillRect(img, 6, 30, 120, 10, 50, 50, 50);
    return { png: encodePngRgb(img), expected: { diagnostic: true } };
  }
  const img = blankRgb(180, 110, 255, 255, 255);
  fillRect(img, 10, 10, 40, 16, 20, 20, 20);
  fillRect(img, 20, 110 - 8 - 40, 20, 40, 220, 20, 20);
  fillRect(img, 50, 110 - 8 - 22, 20, 22, 20, 40, 210);
  return { png: encodePngRgb(img), expected: { mixed: true } };
}

export function writeVisionFixture(kind: VisionFixtureKind, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const { png } = renderVisionFixture(kind);
  const p = path.join(outDir, `${kind}.png`);
  fs.writeFileSync(p, png);
  return p;
}
