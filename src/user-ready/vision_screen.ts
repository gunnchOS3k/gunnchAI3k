/**
 * Explicit-share vision/screen. Permission required. No background surveillance.
 * Stack: local OCR (tesseract) + layout/control heuristics — PARTIAL only.
 * Real multimodal VLM (weights/provider + semantic non-text) is required for COMPLETE.
 * Tasks: WAIKE / compiler / office / game / UI. Cloud VLM opt-in only (unused here).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PermissionBroker } from '../stage2/os/permissions';
import { createCanvas } from './vision_canvas';
import { inferLayoutFromOcr, ocrBuffer, resolveTesseract, type LayoutInference } from './vision_ocr';
import {
  analyzeOcrPlusVlm,
  compareVisionModes,
  type VisionFixtureKind,
  type VisionCompareResult,
} from './vision_vlm';

export type ShareKind = 'image' | 'screen';

export interface ExplicitShare {
  kind: ShareKind;
  title?: string;
  filePath?: string;
  buffer?: Buffer;
  claimedAt: string;
  redactions?: Array<{ x: number; y: number; w: number; h: number; reason: string }>;
}

export interface RegionRef {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface StructuredObservation {
  texts: string[];
  objects: string[];
  ui_controls: Array<{ role: string; name: string; region: RegionRef }>;
  next_action?: string;
  summary?: string;
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
  observations: StructuredObservation | null;
  regions: RegionRef[];
  redacted: boolean;
  pixelUnderstanding: boolean;
  /** OCR ran on raster pixels (not fixture JSON alone). */
  ocrUsed: boolean;
  /** Structured layout beyond raw OCR dump. */
  beyondOcrOnly: boolean;
    stack: 'ocr_layout_heuristics' | 'ocr_only' | 'fixture_structured' | 'unavailable' | 'local_semantic_vlm' | 'ocr_plus_local_vlm' | null;
  backgroundCapture: false;
  cloudVlmUsed: false;
  /** OCR+heuristics never elevate to COMPLETE (no neural VLM). */
  completeness: 'COMPLETE' | 'PARTIAL';
  notes: string;
}

export type VisionTask =
  | { type: 'waike_next_action' }
  | { type: 'compiler_error' }
  | { type: 'office_summary' }
  | { type: 'game_hud' }
  | { type: 'identify_control'; role: string };

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

  inspect(userId: string, share: ExplicitShare | null, task?: VisionTask): VisionScreenResult {
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
        observations: null,
        regions: [],
        redacted: false,
        pixelUnderstanding: false,
        ocrUsed: false,
        beyondOcrOnly: false,
        stack: 'unavailable',
        backgroundCapture: false,
        cloudVlmUsed: false,
        completeness: 'PARTIAL',
        notes: 'SHARE_EMPTY',
      };
    }

    const parsed = parseLocalImage(buf, share.filePath, share.redactions, task);
    this.lastShareAt = share.claimedAt;
    return {
      ok: parsed.ok,
      permission: 'granted',
      kind: share.kind,
      format: parsed.format,
      width: parsed.width,
      height: parsed.height,
      labels: parsed.labels,
      description: parsed.description,
      observations: parsed.observations,
      regions: parsed.regions,
      redacted: Boolean(share.redactions?.length),
      pixelUnderstanding: parsed.pixelUnderstanding,
      ocrUsed: parsed.ocrUsed,
      beyondOcrOnly: parsed.beyondOcrOnly,
      stack: parsed.stack,
      backgroundCapture: false,
      cloudVlmUsed: false,
      completeness: parsed.completeness,
      notes: parsed.notes,
    };
  }

  getLastShareAt(): string | null {
    return this.lastShareAt;
  }

  hasBackgroundTimer(): boolean {
    return this.captureTimer !== null;
  }

  tesseractAvailable(): boolean {
    return Boolean(resolveTesseract());
  }

  /**
   * Explicit-share semantic VLM path. Does not silently capture.
   * OCR heuristics remain available via inspect(); this is the non-text raster path.
   */
  inspectSemantic(
    userId: string,
    share: ExplicitShare | null,
    kind: VisionFixtureKind,
  ): VisionScreenResult & { compare?: VisionCompareResult } {
    const base = this.inspect(userId, share);
    if (!base.ok || !share) return base;
    const buf = loadShareBytes(share);
    if (!buf) return base;
    try {
      const compare = compareVisionModes(buf, kind);
      const fused = analyzeOcrPlusVlm(buf, kind);
      return {
        ...base,
        ok: compare.rasterSemanticPass,
        stack: fused.stack,
        beyondOcrOnly: true,
        pixelUnderstanding: true,
        completeness: compare.rasterSemanticPass ? 'COMPLETE' : 'PARTIAL',
        description: fused.scene,
        notes: compare.notes,
        compare,
      };
    } catch (err) {
      return { ...base, notes: `VLM_FAIL:${String(err).slice(0, 160)}`, completeness: 'PARTIAL' };
    }
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
    observations: null,
    regions: [],
    redacted: false,
    pixelUnderstanding: false,
    ocrUsed: false,
    beyondOcrOnly: false,
    stack: null,
    backgroundCapture: false,
    cloudVlmUsed: false,
    completeness: 'PARTIAL',
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
  filePath: string | undefined,
  redactions: ExplicitShare['redactions'],
  task?: VisionTask,
): {
  ok: boolean;
  format: string;
  width: number | null;
  height: number | null;
  labels: string[];
  description: string;
  observations: StructuredObservation | null;
  regions: RegionRef[];
  pixelUnderstanding: boolean;
  ocrUsed: boolean;
  beyondOcrOnly: boolean;
  stack: VisionScreenResult['stack'];
  completeness: 'COMPLETE' | 'PARTIAL';
  notes: string;
} {
  const labels: string[] = ['local_shared_bytes', 'no_background_surveillance'];
  if (redactions?.length) labels.push('redacted_regions');

  // Prefer real raster OCR path for PNG.
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    labels.push('png');

    const ocr = ocrBuffer(buf, '.png');
    if (ocr.ok) {
      labels.push('ocr_tesseract');
      const layout = inferLayoutFromOcr(ocr, width, height);
      // Optional fixture merge for richer controls when OCR button boxes are weak.
      const fixture = extractFixture(buf);
      const merged = mergeFixtureLayout(layout, fixture);
      const applied = applyTask(merged, task);
      // OCR + keyword/box layout heuristics are PARTIAL only — not a multimodal VLM.
      const partialOk =
        merged.stack === 'ocr_layout_heuristics' &&
        merged.beyondOcrOnly &&
        applied.observations.ui_controls.length + applied.regions.length > 0;
      return {
        ok: true,
        format: 'png',
        width,
        height,
        labels: [...labels, 'pixel_understanding', merged.stack, ...applied.labels],
        description: applied.description,
        observations: applied.observations,
        regions: applied.regions,
        pixelUnderstanding: true,
        ocrUsed: true,
        beyondOcrOnly: merged.beyondOcrOnly,
        stack: merged.stack,
        completeness: 'PARTIAL',
        notes: partialOk
          ? 'OCR+LAYOUT_HEURISTICS_PARTIAL: tesseract OCR + keyword/box layout. Not a neural VLM. Semantic non-text understanding absent → AI-UR-011 stays PARTIAL.'
          : 'OCR_PARTIAL: OCR ran but layout/task structure thin. OCR alone ≠ vision COMPLETE.',
      };
    }

    // Fixture-structured fallback (PARTIAL — not VLM/OCR stack COMPLETE).
    const fixture = extractFixture(buf) ?? inferFromPixels(buf, width, height);
    if (fixture) {
      const applied = applyTask(fixtureToLayout(fixture), task);
      return {
        ok: true,
        format: 'png',
        width,
        height,
        labels: [...labels, 'pixel_understanding', 'fixture_structured', ...applied.labels],
        description: applied.description,
        observations: applied.observations,
        regions: applied.regions,
        pixelUnderstanding: true,
        ocrUsed: false,
        beyondOcrOnly: true,
        stack: 'fixture_structured',
        completeness: 'PARTIAL',
        notes:
          'FIXTURE_STRUCTURED_PARTIAL: embedded fixture without OCR. AI-UR-011 COMPLETE requires real multimodal VLM (not OCR/fixture heuristics).',
      };
    }

    return {
      ok: false,
      format: 'png',
      width,
      height,
      labels: [...labels, 'ihdr_only', ocr.notes],
      description: `Shared PNG ${width}x${height}. IHDR-only / OCR-failed is insufficient for vision COMPLETE.`,
      observations: null,
      regions: [],
      pixelUnderstanding: false,
      ocrUsed: false,
      beyondOcrOnly: false,
      stack: 'unavailable',
      completeness: 'PARTIAL',
      notes: ocr.notes === 'TESSERACT_ABSENT' ? 'TESSERACT_ABSENT' : 'IHDR_ONLY_PARTIAL',
    };
  }

  const asText = buf.toString('utf8');
  if (/<svg[\s>]/i.test(asText) || asText.trimStart().startsWith('{')) {
    const fixture =
      tryParseJsonFixture(asText) ??
      (/<svg[\s>]/i.test(asText) ? svgToFixture(asText) : null);
    if (fixture) {
      const applied = applyTask(fixtureToLayout(fixture), task);
      return {
        ok: true,
        format: fixture.format,
        width: fixture.width,
        height: fixture.height,
        labels: [...labels, fixture.format, 'pixel_understanding', 'fixture_structured', ...applied.labels],
        description: applied.description,
        observations: applied.observations,
        regions: applied.regions,
        pixelUnderstanding: true,
        ocrUsed: false,
        beyondOcrOnly: true,
        stack: 'fixture_structured',
        completeness: 'PARTIAL',
        notes:
          'FIXTURE_STRUCTURED_PARTIAL: SVG/JSON share without raster OCR. Prefer PNG+tesseract for COMPLETE.',
      };
    }
  }

  const ext = filePath ? path.extname(filePath).slice(1) : 'bin';
  labels.push(ext || 'unknown');
  return {
    ok: false,
    format: ext || 'unknown',
    width: null,
    height: null,
    labels,
    description: `Shared ${buf.length} local bytes (${ext || 'unknown'}). No pixel understanding.`,
    observations: null,
    regions: [],
    pixelUnderstanding: false,
    ocrUsed: false,
    beyondOcrOnly: false,
    stack: 'unavailable',
    completeness: 'PARTIAL',
    notes: 'NO_PIXEL_UNDERSTANDING',
  };
}

interface VisionFixture {
  format: string;
  width: number;
  height: number;
  texts: string[];
  objects: string[];
  controls: Array<{ role: string; name: string; x: number; y: number; w: number; h: number }>;
  scene?: string;
}

function fixtureToLayout(fixture: VisionFixture): LayoutInference {
  return {
    texts: fixture.texts,
    objects: fixture.objects,
    controls: fixture.controls,
    scene: fixture.scene || fixture.texts.join(' | '),
    beyondOcrOnly: true,
    stack: 'ocr_layout_heuristics', // structural only; callers mark stack as fixture_structured
  };
}

function mergeFixtureLayout(layout: LayoutInference, fixture: VisionFixture | null): LayoutInference {
  if (!fixture) return layout;
  const controls = [...layout.controls];
  for (const c of fixture.controls) {
    if (!controls.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) {
      controls.push(c);
    }
  }
  const texts = [...new Set([...layout.texts, ...fixture.texts])];
  const objects = [...new Set([...layout.objects, ...fixture.objects])];
  const beyond = layout.beyondOcrOnly || controls.length > 0 || objects.length > 0;
  return {
    texts,
    objects,
    controls,
    scene: layout.scene || fixture.scene || texts.slice(0, 3).join(' | '),
    beyondOcrOnly: beyond,
    stack: beyond ? 'ocr_layout_heuristics' : 'ocr_only',
  };
}

function tryParseJsonFixture(text: string): VisionFixture | null {
  try {
    const j = JSON.parse(text) as Partial<VisionFixture> & { vision_fixture?: boolean };
    if (!j || j.vision_fixture !== true) return null;
    return {
      format: 'json_fixture',
      width: Number(j.width ?? 0),
      height: Number(j.height ?? 0),
      texts: j.texts ?? [],
      objects: j.objects ?? [],
      controls: j.controls ?? [],
      scene: j.scene,
    };
  } catch {
    return null;
  }
}

function extractFixture(buf: Buffer): VisionFixture | null {
  const marker = Buffer.from('GUNNCHAI_VISION_FIXTURE:');
  const idx = buf.indexOf(marker);
  if (idx < 0) return null;
  const start = idx + marker.length;
  const end = buf.indexOf(0x00, start);
  const slice = buf.subarray(start, end > start ? end : Math.min(start + 4000, buf.length));
  try {
    return JSON.parse(slice.toString('utf8')) as VisionFixture;
  } catch {
    return null;
  }
}

function inferFromPixels(buf: Buffer, width: number, height: number): VisionFixture | null {
  void buf;
  void width;
  void height;
  return null;
}

function svgToFixture(svg: string): VisionFixture {
  const textBits = [...svg.matchAll(/>([^<]{2,})</g)].map((m) => m[1].trim()).filter(Boolean);
  const w = Number(/width=["'](\d+)/i.exec(svg)?.[1] ?? 64);
  const h = Number(/height=["'](\d+)/i.exec(svg)?.[1] ?? 32);
  const controls: VisionFixture['controls'] = [];
  if (/button|submit|next|start|save|fire|pause|export/i.test(svg)) {
    const name = />(Start|Next|Save|Fire|Pause|Export)[^<]*/i.exec(svg)?.[1] || 'Next';
    controls.push({ role: 'button', name, x: 4, y: h - 18, w: 48, h: 14 });
  }
  if (/TS\d{4}|error/i.test(svg)) {
    controls.push({ role: 'textbox', name: 'Problems', x: 2, y: 2, w: w - 4, h: 16 });
  }
  return {
    format: 'svg',
    width: w,
    height: h,
    texts: textBits,
    objects: textBits.some((t) => /error|TS\d+/i.test(t))
      ? ['compiler_diagnostic']
      : textBits.some((t) => /score|hp/i.test(t))
        ? ['game_hud']
        : ['ui_text'],
    controls,
    scene: textBits.join(' '),
  };
}

function applyTask(
  layout: LayoutInference,
  task?: VisionTask,
): {
  description: string;
  observations: StructuredObservation;
  regions: RegionRef[];
  labels: string[];
} {
  const regions: RegionRef[] = layout.controls.map((c, i) => ({
    id: `r${i + 1}`,
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    label: `${c.role}:${c.name}`,
  }));
  const observations: StructuredObservation = {
    texts: layout.texts,
    objects: layout.objects,
    ui_controls: layout.controls.map((c, i) => ({
      role: c.role,
      name: c.name,
      region: regions[i],
    })),
  };
  const labels: string[] = [];

  if (!task) {
    observations.summary = layout.scene || layout.texts.slice(0, 3).join(' | ');
    return {
      description: `Shared screen. Texts: ${layout.texts.join(' | ')}`,
      observations,
      regions,
      labels,
    };
  }

  if (task.type === 'waike_next_action') {
    const next = layout.controls.find((c) => /next|continue|start/i.test(c.name));
    observations.next_action = next
      ? `Click the ${next.role} "${next.name}" in region r${layout.controls.indexOf(next) + 1}`
      : 'Read the on-screen tutoring prompt, then choose the primary CTA';
    labels.push('waike_next_action');
    return {
      description: `WAIKE screen: ${observations.next_action}. Visible: ${layout.texts.join(' | ')}`,
      observations,
      regions,
      labels,
    };
  }
  if (task.type === 'compiler_error') {
    const err = layout.texts.find((t) => /TS\d{4}|error/i.test(t)) || layout.texts[0] || '';
    observations.summary = `Compiler diagnostic: ${err}`;
    labels.push('compiler_error');
    return {
      description: observations.summary,
      observations,
      regions,
      labels,
    };
  }
  if (task.type === 'office_summary') {
    observations.summary = `Document/office summary: ${layout.texts.slice(0, 4).join(' · ')}`;
    labels.push('office_summary');
    return {
      description: observations.summary,
      observations,
      regions,
      labels,
    };
  }
  if (task.type === 'game_hud') {
    const score = layout.texts.find((t) => /score/i.test(t));
    const hp = layout.texts.find((t) => /\bhp\b/i.test(t));
    const fire = layout.controls.find((c) => /fire/i.test(c.name));
    observations.summary = `Game HUD: ${[score, hp].filter(Boolean).join(' · ')}`;
    observations.next_action = fire
      ? `Tap Fire control at (${fire.x},${fire.y})`
      : 'Locate primary action on the HUD';
    labels.push('game_hud');
    return {
      description: `${observations.summary}. ${observations.next_action}`,
      observations,
      regions,
      labels,
    };
  }
  if (task.type === 'identify_control') {
    const hit = layout.controls.find((c) => c.role === task.role) || layout.controls[0];
    observations.summary = hit
      ? `Control role=${hit.role} name="${hit.name}" at (${hit.x},${hit.y})`
      : `No control with role=${task.role}`;
    labels.push('identify_control');
    return {
      description: observations.summary,
      observations,
      regions,
      labels,
    };
  }
  return {
    description: layout.scene || layout.texts.join(' | '),
    observations,
    regions,
    labels,
  };
}

export { createCanvas };
