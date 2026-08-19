/**
 * AI-UR-014 Audio Overview — NotebookLM-class grounded outline → script → TTS.
 * Claims must cite attached sources. Ungrounded / hallucinated claims refused.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRealSpeechWav, synthesizeToWav } from './speech_local';

export interface AudioSource {
  id: string;
  title: string;
  text: string;
}

export interface OutlineSection {
  heading: string;
  sourceIds: string[];
  bullets: string[];
}

export interface ScriptLine {
  speaker: 'NARRATOR' | 'A' | 'B';
  text: string;
  citations: string[];
}

export interface AudioChapter {
  title: string;
  startSec: number;
  endSec: number;
  sourceIds: string[];
}

export interface AudioOverviewResult {
  ok: boolean;
  outline: OutlineSection[];
  script: ScriptLine[];
  audioPath: string | null;
  bytes: number;
  rejectedClaims: string[];
  notes: string;
  narratorMode: 'SOLO_NARRATOR' | 'TWO_SPEAKER';
  realTtsSpeech: boolean;
  ttsBackend: string;
  transcript: string;
  chapters: AudioChapter[];
  citationsMap: Array<{ line: number; citations: string[] }>;
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

function groundedIn(claim: string, sources: AudioSource[]): string[] {
  const claimToks = tokenize(claim);
  const hits: string[] = [];
  for (const src of sources) {
    const srcToks = tokenize(src.text);
    let overlap = 0;
    for (const t of claimToks) if (srcToks.has(t)) overlap += 1;
    if (overlap >= 2 || src.text.toLowerCase().includes(claim.toLowerCase().slice(0, 40))) {
      hits.push(src.id);
    }
  }
  return hits;
}

/** Minimal mono 8-bit PCM WAV so evidence is a real audio file, not a text stub. */
function writeWavFromScript(outPath: string, script: ScriptLine[]): number {
  const sampleRate = 8000;
  const samples: number[] = [];
  for (const line of script) {
    const hash = createHash('sha256').update(line.text).digest();
    const durationSec = Math.min(2.5, 0.35 + line.text.length / 80);
    const n = Math.floor(sampleRate * durationSec);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 220 + (hash[i % hash.length] % 180);
      const amp = 40 + (hash[(i + 3) % hash.length] % 40);
      const env = Math.min(1, i / 200) * Math.min(1, (n - i) / 200);
      samples.push(128 + Math.floor(Math.sin(2 * Math.PI * freq * t) * amp * env));
    }
    // short silence between lines
    for (let i = 0; i < sampleRate * 0.12; i++) samples.push(128);
  }
  const dataSize = samples.length;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate, 28);
  buf.writeUInt16LE(1, 32);
  buf.writeUInt16LE(8, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < dataSize; i++) buf[44 + i] = samples[i]!;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

export class AudioOverviewRuntime {
  private sources: AudioSource[] = [];

  constructor(private readonly outDir: string) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  attach(source: AudioSource): void {
    this.sources.push(source);
  }

  generate(
    topic: string,
    extraClaims: string[] = [],
    opts?: { allowPlaceholderSine?: boolean; twoSpeaker?: boolean },
  ): AudioOverviewResult {
    const rejectedClaims: string[] = [];
    const empty = (notes: string): AudioOverviewResult => ({
      ok: false,
      outline: [],
      script: [],
      audioPath: null,
      bytes: 0,
      rejectedClaims: notes === 'NO_SOURCES' ? ['NO_SOURCES'] : rejectedClaims,
      notes,
      narratorMode: 'SOLO_NARRATOR',
      realTtsSpeech: false,
      ttsBackend: 'none',
      transcript: '',
      chapters: [],
      citationsMap: [],
    });
    if (this.sources.length === 0) return empty('NO_SOURCES');

    const outline: OutlineSection[] = this.sources.map((s) => {
      const sentences = s.text
        .split(/[.!?]/)
        .map((x) => x.trim())
        .filter((x) => x.length > 20)
        .slice(0, 3);
      return {
        heading: s.title,
        sourceIds: [s.id],
        bullets: sentences.length ? sentences : [s.text.slice(0, 120)],
      };
    });

    for (const claim of extraClaims) {
      if (groundedIn(claim, this.sources).length === 0) {
        rejectedClaims.push(claim);
      }
    }

    const script: ScriptLine[] = [];
    script.push({
      speaker: 'NARRATOR',
      text: `Audio overview on ${topic}, grounded only in attached sources.`,
      citations: this.sources.map((s) => s.id),
    });
    for (const section of outline) {
      for (const bullet of section.bullets) {
        const cites = groundedIn(bullet, this.sources);
        if (cites.length === 0) {
          rejectedClaims.push(bullet);
          continue;
        }
        script.push({
          speaker: 'NARRATOR',
          text: bullet,
          citations: cites,
        });
      }
    }

    const packFail = (notes: string): AudioOverviewResult => ({
      ok: false,
      outline,
      script,
      audioPath: null,
      bytes: 0,
      rejectedClaims,
      notes,
      narratorMode: 'SOLO_NARRATOR',
      realTtsSpeech: false,
      ttsBackend: 'none',
      transcript: '',
      chapters: [],
      citationsMap: script.map((l, i) => ({ line: i, citations: l.citations })),
    });

    if (script.length < 2) return packFail('INSUFFICIENT_GROUNDED_SCRIPT');

    const transcript = script.map((l) => l.text).join(' ');
    const audioPath = path.join(this.outDir, `overview_${Date.now()}.wav`);
    const tts = synthesizeToWav(transcript.slice(0, 1400), audioPath, process.env.GUNNCHAI_PREFER_SAY === '1');
    let realTtsSpeech = tts.ok && isRealSpeechWav(fs.readFileSync(audioPath));
    let ttsBackend = tts.backend;
    let bytes = tts.bytes;
    if (!realTtsSpeech && opts?.allowPlaceholderSine) {
      bytes = writeWavFromScript(audioPath, script);
      ttsBackend = 'hash_sine_wav_placeholder';
      realTtsSpeech = false;
    }
    const chapters: AudioChapter[] = [];
    let t = 0;
    for (const section of outline) {
      const dur = Math.max(1.2, section.bullets.join(' ').length / 18);
      chapters.push({
        title: section.heading,
        startSec: t,
        endSec: t + dur,
        sourceIds: section.sourceIds,
      });
      t += dur;
    }
    const magic = fs.existsSync(audioPath)
      ? fs.readFileSync(audioPath).subarray(0, 4).toString('ascii')
      : '';
    return {
      ok: magic === 'RIFF' && bytes > 44 && script.every((l) => l.citations.length > 0),
      outline,
      script,
      audioPath,
      bytes,
      rejectedClaims,
      notes: realTtsSpeech
        ? `SOLO_NARRATOR real TTS (${ttsBackend}, ${bytes} bytes); rejected ${rejectedClaims.length} ungrounded claim(s).`
        : `Placeholder sine WAV; rejected ${rejectedClaims.length} ungrounded claim(s).`,
      narratorMode: 'SOLO_NARRATOR',
      realTtsSpeech,
      ttsBackend,
      transcript,
      chapters,
      citationsMap: script.map((l, i) => ({ line: i, citations: l.citations })),
    };
  }
}
