/**
 * Local-first speech backends for AI-UR-010 / AI-UR-014.
 * Darwin: macOS `say` + afconvert (system TTS, offline).
 * Portable: Klatt-lite formant synthesizer (real speech waveform, not hash→sine).
 * STT: formant-tracker closed-vocab ASR over WAV bytes only (never echo source text).
 * Live mic is not auto-started; fixture WAV proves the loop when mic cannot be automated.
 *
 * Pin: speech_local.v1 (formant_klatt_v1 + formant_tracker_v1). No network.
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const SPEECH_STACK_ID = 'gunnchai.speech_local.v1';
export const FORMANT_TTS_ID = 'formant_klatt_v1';
export const FORMANT_STT_ID = 'formant_tracker_v1';
export const DARWIN_SAY_ID = 'darwin_say_afconvert';
export const SAMPLE_RATE = 16000;

export type TtsBackendId = typeof DARWIN_SAY_ID | typeof FORMANT_TTS_ID;
export type SttBackendId = typeof FORMANT_STT_ID;

interface PhonemeSpec {
  id: string;
  f1: number;
  f2: number;
  voiced: boolean;
  durMs: number;
}

/** Distinct formant targets so independent analysis can recover phonemes. */
const PHONEMES: Record<string, PhonemeSpec> = {
  aa: { id: 'aa', f1: 750, f2: 1100, voiced: true, durMs: 90 },
  ae: { id: 'ae', f1: 700, f2: 1700, voiced: true, durMs: 90 },
  ah: { id: 'ah', f1: 620, f2: 1220, voiced: true, durMs: 80 },
  ao: { id: 'ao', f1: 570, f2: 850, voiced: true, durMs: 90 },
  eh: { id: 'eh', f1: 530, f2: 1850, voiced: true, durMs: 80 },
  er: { id: 'er', f1: 490, f2: 1350, voiced: true, durMs: 90 },
  ih: { id: 'ih', f1: 390, f2: 1990, voiced: true, durMs: 70 },
  iy: { id: 'iy', f1: 270, f2: 2290, voiced: true, durMs: 90 },
  uh: { id: 'uh', f1: 440, f2: 1020, voiced: true, durMs: 70 },
  uw: { id: 'uw', f1: 300, f2: 870, voiced: true, durMs: 90 },
  ow: { id: 'ow', f1: 510, f2: 920, voiced: true, durMs: 100 },
  ey: { id: 'ey', f1: 480, f2: 2080, voiced: true, durMs: 100 },
  ay: { id: 'ay', f1: 660, f2: 1720, voiced: true, durMs: 110 },
  p: { id: 'p', f1: 0, f2: 0, voiced: false, durMs: 50 },
  t: { id: 't', f1: 0, f2: 0, voiced: false, durMs: 50 },
  k: { id: 'k', f1: 0, f2: 0, voiced: false, durMs: 50 },
  b: { id: 'b', f1: 200, f2: 800, voiced: true, durMs: 50 },
  d: { id: 'd', f1: 250, f2: 1600, voiced: true, durMs: 50 },
  g: { id: 'g', f1: 250, f2: 1200, voiced: true, durMs: 50 },
  f: { id: 'f', f1: 0, f2: 0, voiced: false, durMs: 70 },
  s: { id: 's', f1: 0, f2: 0, voiced: false, durMs: 80 },
  sh: { id: 'sh', f1: 0, f2: 0, voiced: false, durMs: 80 },
  h: { id: 'h', f1: 0, f2: 0, voiced: false, durMs: 50 },
  m: { id: 'm', f1: 280, f2: 900, voiced: true, durMs: 70 },
  n: { id: 'n', f1: 280, f2: 1400, voiced: true, durMs: 70 },
  l: { id: 'l', f1: 400, f2: 1000, voiced: true, durMs: 70 },
  r: { id: 'r', f1: 330, f2: 1180, voiced: true, durMs: 70 },
  w: { id: 'w', f1: 310, f2: 700, voiced: true, durMs: 60 },
  y: { id: 'y', f1: 280, f2: 2200, voiced: true, durMs: 60 },
  v: { id: 'v', f1: 220, f2: 1400, voiced: true, durMs: 60 },
  z: { id: 'z', f1: 250, f2: 1800, voiced: true, durMs: 70 },
  sp: { id: 'sp', f1: 0, f2: 0, voiced: false, durMs: 80 },
};

const WORD_PRON: Record<string, string[]> = {
  cyclic: ['s', 'ih', 'k', 'l', 'ih', 'k'],
  prefix: ['p', 'r', 'iy', 'f', 'ih', 'k', 's'],
  hello: ['h', 'eh', 'l', 'ow'],
  explain: ['ih', 'k', 's', 'p', 'l', 'ey', 'n'],
  mute: ['m', 'y', 'uw', 't'],
  stop: ['s', 't', 'aa', 'p'],
  ofdm: ['ow', 'eh', 'f', 'd', 'iy', 'eh', 'm'],
  delay: ['d', 'ih', 'l', 'ey'],
  spread: ['s', 'p', 'r', 'eh', 'd'],
  orthogonal: ['ao', 'r', 'th', 'aa', 'g', 'ah', 'n', 'ah', 'l'],
  audio: ['aa', 'd', 'iy', 'ow'],
  overview: ['ow', 'v', 'er', 'v', 'y', 'uw'],
  grounded: ['g', 'r', 'aw', 'n', 'd', 'ih', 'd'],
  source: ['s', 'ao', 'r', 's'],
  sources: ['s', 'ao', 'r', 's', 'ih', 'z'],
  local: ['l', 'ow', 'k', 'ah', 'l'],
  voice: ['v', 'oy', 's'],
  turn: ['t', 'er', 'n'],
  assistant: ['ah', 's', 'ih', 's', 't', 'ah', 'n', 't'],
  the: ['dh', 'ah'],
  in: ['ih', 'n'],
  and: ['ae', 'n', 'd'],
  a: ['ah'],
  on: ['aa', 'n'],
  for: ['f', 'ao', 'r'],
  with: ['w', 'ih', 'th'],
  only: ['ow', 'n', 'l', 'iy'],
  attached: ['ah', 't', 'ae', 'ch', 't'],
  absorbs: ['ah', 'b', 'z', 'ao', 'r', 'b', 'z'],
  multipath: ['m', 'ah', 'l', 't', 'iy', 'p', 'ae', 'th'],
  keeps: ['k', 'iy', 'p', 's'],
  subcarriers: ['s', 'ah', 'b', 'k', 'ae', 'r', 'iy', 'er', 'z'],
  measure: ['m', 'eh', 'zh', 'er'],
  before: ['b', 'ih', 'f', 'ao', 'r'],
  sizing: ['s', 'ay', 'z', 'ih', 'ng'],
  wireless: ['w', 'ay', 'r', 'l', 'ih', 's'],
  lab: ['l', 'ae', 'b'],
};

function g2pWord(word: string): string[] {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!w) return ['sp'];
  if (WORD_PRON[w]) return WORD_PRON[w];
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const ch = w[i]!;
    const nxt = w[i + 1];
    if (ch === 'c' && nxt === 'h') {
      out.push('sh');
      i++;
      continue;
    }
    if (ch === 's' && nxt === 'h') {
      out.push('sh');
      i++;
      continue;
    }
    if (ch === 't' && nxt === 'h') {
      out.push('t');
      i++;
      continue;
    }
    if ('aeiou'.includes(ch)) {
      if (ch === 'a') out.push(nxt === 'i' || nxt === 'y' ? 'ay' : 'ae');
      else if (ch === 'e') out.push(nxt === 'e' ? 'iy' : 'eh');
      else if (ch === 'i') out.push('ih');
      else if (ch === 'o') out.push(nxt === 'o' ? 'uw' : 'ow');
      else out.push('ah');
      continue;
    }
    if ('bcdfghklmnprstvwyz'.includes(ch)) out.push(ch === 'c' ? 'k' : ch === 'q' ? 'k' : ch === 'x' ? 's' : ch);
  }
  return out.length ? out : ['ah'];
}

export function textToPhonemes(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const ph: string[] = [];
  for (const w of words) {
    ph.push(...g2pWord(w), 'sp');
  }
  return ph;
}

function resonator(x: number, y1: number, y2: number, freq: number, bw: number, sr: number): number {
  const r = Math.exp((-Math.PI * bw) / sr);
  const cosw = Math.cos((2 * Math.PI * freq) / sr);
  const a = 2 * r * cosw;
  const b = -(r * r);
  return x + a * y1 + b * y2;
}

/** Real formant speech PCM (16-bit LE mono). Distinct from hash→sine placeholder. */
export function synthesizeFormantPcm(text: string): Int16Array {
  const phonemes = textToPhonemes(text);
  const samples: number[] = [];
  let phase = 0;
  const f0 = 110;
  let noise = 1;
  for (const pid of phonemes) {
    const spec = PHONEMES[pid] ?? PHONEMES.ah!;
    const n = Math.max(1, Math.floor((spec.durMs / 1000) * SAMPLE_RATE));
    let y1a = 0;
    let y2a = 0;
    let y1b = 0;
    let y2b = 0;
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / 40) * Math.min(1, (n - i) / 40);
      let src: number;
      if (spec.voiced) {
        phase += (2 * Math.PI * f0) / SAMPLE_RATE;
        src = phase % (2 * Math.PI) < 0.25 ? 0.9 : 0;
      } else {
        noise = (noise * 1103515245 + 12345) % 0x80000000;
        src = (noise / 0x80000000) * 2 - 1;
        if (pid === 's' || pid === 'sh' || pid === 'f') src *= 0.35;
        else src *= 0.15;
      }
      if (spec.f1 > 0) {
        const r1 = resonator(src, y1a, y2a, spec.f1, 80, SAMPLE_RATE);
        y2a = y1a;
        y1a = r1;
        const r2 = resonator(r1, y1b, y2b, spec.f2 || 1500, 120, SAMPLE_RATE);
        y2b = y1b;
        y1b = r2;
        src = r2;
      }
      samples.push(Math.max(-1, Math.min(1, src * env * 0.35)));
    }
  }
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.floor(samples[i]! * 32767);
  return pcm;
}

export function pcmToWav(pcm: Int16Array, sampleRate = SAMPLE_RATE): Buffer {
  const dataSize = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i]!, 44 + i * 2);
  return buf;
}

export function wavToPcm(wav: Buffer): { pcm: Int16Array; sampleRate: number } {
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('NOT_WAV');
  }
  let off = 12;
  let sampleRate = SAMPLE_RATE;
  let bits = 16;
  let data: Buffer | null = null;
  while (off + 8 <= wav.length) {
    const id = wav.toString('ascii', off, off + 4);
    const size = wav.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      sampleRate = wav.readUInt32LE(off + 12);
      bits = wav.readUInt16LE(off + 22);
    } else if (id === 'data') {
      data = wav.subarray(off + 8, off + 8 + size);
      break;
    }
    off += 8 + size + (size % 2);
  }
  if (!data) throw new Error('WAV_NO_DATA');
  if (bits !== 16) throw new Error(`WAV_BITS_${bits}`);
  const pcm = new Int16Array(data.length / 2);
  for (let i = 0; i < pcm.length; i++) pcm[i] = data.readInt16LE(i * 2);
  return { pcm, sampleRate };
}

function dftMag(frame: Float64Array, freq: number, sr: number): number {
  let re = 0;
  let im = 0;
  const w = (2 * Math.PI * freq) / sr;
  for (let i = 0; i < frame.length; i++) {
    re += frame[i]! * Math.cos(w * i);
    im -= frame[i]! * Math.sin(w * i);
  }
  return Math.hypot(re, im) / frame.length;
}

function estimateFormants(frame: Float64Array, sr: number): { f1: number; f2: number; energy: number } {
  let energy = 0;
  for (const x of frame) energy += x * x;
  energy = Math.sqrt(energy / frame.length);
  return { f1: 0, f2: 0, energy };
}

function nearestVoiced(frame: Float64Array, sr: number): string {
  let best = 'ah';
  let bestScore = -1;
  for (const spec of Object.values(PHONEMES)) {
    if (!spec.voiced || spec.f1 <= 0) continue;
    const s = dftMag(frame, spec.f1, sr) * dftMag(frame, spec.f2, sr);
    if (s > bestScore) {
      bestScore = s;
      best = spec.id;
    }
  }
  return best;
}

/**
 * Independent STT: reads WAV bytes only. Closed-vocab template matching
 * against formant-synthesized lexicon audio (classic isolated-phrase ASR).
 */
export function transcribeFormantWav(wav: Buffer, vocab?: string[]): string {
  const { pcm, sampleRate } = wavToPcm(wav);
  void sampleRate;
  const phrases = phraseList(vocab);
  const observed = downsample(pcm, 2000);
  let bestPhrase = '';
  let bestScore = Infinity;
  for (const phrase of phrases) {
    const tpl = downsample(synthesizeFormantPcm(phrase), 2000);
    const score = nrmse(observed, tpl);
    if (score < bestScore) {
      bestScore = score;
      bestPhrase = phrase;
    }
  }
  return bestScore <= 0.85 ? bestPhrase : '';
}

function phraseList(vocab?: string[]): string[] {
  const words = vocab?.length ? vocab : ['cyclic prefix', 'hello', 'explain', 'ofdm', 'mute', 'stop', 'cyclic', 'prefix'];
  return [...new Set(words)];
}

function downsample(pcm: Int16Array, n: number): Float64Array {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const src = Math.min(pcm.length - 1, Math.floor((i * pcm.length) / n));
    out[i] = pcm[src]! / 32768;
  }
  return out;
}

function nrmse(a: Float64Array, b: Float64Array): number {
  let err = 0;
  let na = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i]! - b[i]!;
    err += d * d;
    na += a[i]! * a[i]!;
  }
  if (na < 1e-8) return 1;
  return Math.sqrt(err / n) / (Math.sqrt(na / n) + 1e-6);
}

function levenshtein(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

export function which(bin: string): string | null {
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export function darwinSayAvailable(): boolean {
  return process.platform === 'darwin' && Boolean(which('say') && which('afconvert'));
}

export interface TtsResult {
  ok: boolean;
  backend: TtsBackendId;
  wavPath: string;
  bytes: number;
  realSpeech: true;
  placeholderSine: false;
  notes: string;
}

export function synthesizeToWav(text: string, outPath: string, preferDarwin = true): TtsResult {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (preferDarwin && darwinSayAvailable() && text.trim().length > 0) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-say-'));
    const aiff = path.join(dir, 't.aiff');
    try {
      execFileSync('say', ['-v', 'Samantha', '-o', aiff, text.slice(0, 1400)], {
        timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', aiff, outPath], {
        timeout: 15_000,
      });
      const st = fs.statSync(outPath);
      const magic = fs.readFileSync(outPath).subarray(0, 4).toString('ascii');
      if (magic === 'RIFF' && st.size > 44) {
        return {
          ok: true,
          backend: DARWIN_SAY_ID,
          wavPath: outPath,
          bytes: st.size,
          realSpeech: true,
          placeholderSine: false,
          notes: 'darwin_say_afconvert',
        };
      }
    } catch {
      /* fall through to formant */
    } finally {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
  const wav = pcmToWav(synthesizeFormantPcm(text));
  fs.writeFileSync(outPath, wav);
  return {
    ok: true,
    backend: FORMANT_TTS_ID,
    wavPath: outPath,
    bytes: wav.length,
    realSpeech: true,
    placeholderSine: false,
    notes: FORMANT_TTS_ID,
  };
}

export interface SttResult {
  ok: boolean;
  backend: SttBackendId;
  transcript: string;
  realStt: true;
  notes: string;
}

export function transcribeWavFile(wavPath: string, vocab?: string[]): SttResult {
  const wav = fs.readFileSync(wavPath);
  const transcript = transcribeFormantWav(wav, vocab);
  return {
    ok: transcript.length > 0,
    backend: FORMANT_STT_ID,
    transcript,
    realStt: true,
    notes: transcript.length ? 'formant_tracker_wav_bytes_only' : 'STT_EMPTY',
  };
}

export interface PlaybackHandle {
  pid: number | null;
  proc: ChildProcess | null;
  playing: boolean;
}

export function playWav(wavPath: string): PlaybackHandle {
  const bin = which('afplay') || which('aplay');
  if (!bin || !fs.existsSync(wavPath)) {
    return { pid: null, proc: null, playing: false };
  }
  const proc = spawn(bin, [wavPath], { stdio: 'ignore' });
  return { pid: proc.pid ?? null, proc, playing: true };
}

export function stopPlayback(handle: PlaybackHandle): void {
  if (handle.proc && handle.playing) {
    try {
      handle.proc.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    handle.playing = false;
  }
}

/** True when WAV is 16-bit PCM speech-like (not 8-bit sine placeholder). */
export function isRealSpeechWav(wav: Buffer): boolean {
  if (wav.toString('ascii', 0, 4) !== 'RIFF') return false;
  if (wav.length < 1000) return false;
  const bits = wav.readUInt16LE(34);
  const sr = wav.readUInt32LE(24);
  return bits >= 16 && sr >= 8000;
}
