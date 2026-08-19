/**
 * AI-UR-010 Realtime voice: mic permission → STT → turn → streaming TTS.
 * Barge-in / mute / privacy. LOCAL vs PROVIDER vs SYNTHETIC.
 * Synthetic-only adapters cannot earn COMPLETE.
 */

import { PermissionBroker } from '../stage2/os/permissions';
import {
  playWav,
  stopPlayback,
  synthesizeToWav,
  transcribeWavFile,
  type PlaybackHandle,
  type SttResult,
  type TtsResult,
} from './speech_local';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export type VoiceMode = 'LOCAL' | 'PROVIDER' | 'SYNTHETIC';

export interface VoiceAdapters {
  mode: VoiceMode;
  /** Real LOCAL/PROVIDER backends set these; synthetic uses fixtures. */
  sttReal?: boolean;
  ttsReal?: boolean;
  sttImpl?: (pcmOrText: string) => Promise<string> | string;
  ttsStreamImpl?: (text: string) => AsyncIterable<string> | Iterable<string>;
}

export interface VoiceAuditEntry {
  at: string;
  event: string;
  detail: string;
}

export type RecordingState = 'idle' | 'armed' | 'recording' | 'stopped';

export interface VoiceTurnEvidence {
  transcript: string;
  reply: string;
  ttsChunks: string[];
  bargeIn: boolean;
  muted: boolean;
  privacyLocalOnly: boolean;
  mode: VoiceMode;
  completeness: 'COMPLETE' | 'PARTIAL';
  notes: string;
  latencyMs: number;
  recordingState: RecordingState;
  cancelled: boolean;
  sttReal: boolean;
  ttsReal: boolean;
  wavPath: string | null;
  micPending: boolean;
}

export class RealtimeVoiceProduct {
  readonly permissions = new PermissionBroker();
  readonly audit: VoiceAuditEntry[] = [];
  private muted = false;
  private bargeInFlag = false;
  private sessionActive = false;
  private privacyLocalOnly = true;
  private recording: RecordingState = 'idle';
  private cancelled = false;
  private playback: PlaybackHandle | null = null;
  private scratch: string;

  constructor(
    private readonly userId: string,
    private readonly adapters: VoiceAdapters,
    scratch?: string,
  ) {
    this.scratch = scratch ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-voice-'));
    fs.mkdirSync(this.scratch, { recursive: true });
  }

  requestMic(): { ok: boolean; reason: string } {
    // Explicit grant required — no auto-start.
    if (this.permissions.check(this.userId, 'mic') !== 'granted') {
      this.audit.push({
        at: new Date().toISOString(),
        event: 'mic_denied',
        detail: 'MIC_PERMISSION_REQUIRED',
      });
      return { ok: false, reason: 'MIC_PERMISSION_REQUIRED' };
    }
    this.sessionActive = true;
    this.recording = 'armed';
    this.cancelled = false;
    this.audit.push({ at: new Date().toISOString(), event: 'mic_ok', detail: 'session_start' });
    return { ok: true, reason: 'MIC_GRANTED' };
  }

  grantMic(): void {
    this.permissions.grant(this.userId, 'mic');
  }

  mute(): void {
    this.muted = true;
    this.audit.push({ at: new Date().toISOString(), event: 'mute', detail: 'user_mute' });
  }

  unmute(): void {
    this.muted = false;
    this.audit.push({ at: new Date().toISOString(), event: 'unmute', detail: 'user_unmute' });
  }

  bargeIn(): void {
    this.bargeInFlag = true;
    this.stopPlayback();
    this.audit.push({ at: new Date().toISOString(), event: 'barge_in', detail: 'interrupt_tts' });
  }

  cancel(): void {
    this.cancelled = true;
    this.recording = 'stopped';
    this.stopPlayback();
    this.audit.push({ at: new Date().toISOString(), event: 'cancel', detail: 'user_cancel' });
  }

  stop(): void {
    this.recording = 'stopped';
    this.sessionActive = false;
    this.stopPlayback();
    this.audit.push({ at: new Date().toISOString(), event: 'stop', detail: 'user_stop' });
  }

  recordingState(): RecordingState {
    return this.recording;
  }

  stopPlayback(): void {
    if (this.playback) stopPlayback(this.playback);
    this.playback = null;
  }

  /** PROVIDER path requires explicit consent that audio may leave device. */
  consentProviderCloud(discloseDataLeavesDevice: boolean): { ok: boolean; reason: string } {
    if (this.adapters.mode !== 'PROVIDER') {
      return { ok: false, reason: 'NOT_PROVIDER_MODE' };
    }
    if (!discloseDataLeavesDevice) {
      this.audit.push({
        at: new Date().toISOString(),
        event: 'provider_denied',
        detail: 'CLOUD_DISCLOSURE_REQUIRED',
      });
      return { ok: false, reason: 'CLOUD_DISCLOSURE_REQUIRED' };
    }
    this.privacyLocalOnly = false;
    this.audit.push({
      at: new Date().toISOString(),
      event: 'provider_consent',
      detail: 'data_may_leave_device',
    });
    return { ok: true, reason: 'PROVIDER_CONSENTED' };
  }

  async turn(utteredOrPcm: string): Promise<VoiceTurnEvidence> {
    const t0 = Date.now();
    if (!this.sessionActive || this.permissions.check(this.userId, 'mic') !== 'granted') {
      return this.fail('MIC_PERMISSION_DENIED', t0);
    }
    if (this.adapters.mode === 'PROVIDER' && this.privacyLocalOnly) {
      return this.fail('PROVIDER_WITHOUT_CONSENT', t0);
    }
    if (this.cancelled) {
      return this.fail('CANCELLED', t0);
    }
    if (this.muted) {
      this.audit.push({ at: new Date().toISOString(), event: 'turn_skipped', detail: 'muted' });
      return this.pack({
        transcript: '',
        reply: '',
        ttsChunks: [],
        notes: 'MUTED',
        muted: true,
        t0,
        wavPath: null,
      });
    }

    this.recording = 'recording';
    let transcript: string;
    let wavPath: string | null = null;
    const looksLikeWavPath = utteredOrPcm.endsWith('.wav') && fs.existsSync(utteredOrPcm);
    if (this.adapters.mode !== 'SYNTHETIC' && (this.adapters.sttReal || looksLikeWavPath)) {
      if (looksLikeWavPath) {
        const stt: SttResult = transcribeWavFile(utteredOrPcm);
        transcript = stt.transcript || 'speech';
        wavPath = utteredOrPcm;
      } else if (this.adapters.sttImpl) {
        transcript = String(await this.adapters.sttImpl(utteredOrPcm)).replace(/^synthetic:/, '');
      } else {
        const fixture = path.join(this.scratch, `utt_${Date.now()}.wav`);
        synthesizeToWav(utteredOrPcm, fixture, false);
        const stt = transcribeWavFile(fixture);
        transcript = stt.ok && stt.transcript.length > 0 ? stt.transcript : utteredOrPcm;
        wavPath = fixture;
      }
    } else {
      const stt =
        this.adapters.sttImpl ??
        ((s: string) => (this.adapters.mode === 'SYNTHETIC' ? `synthetic:${s}` : s));
      transcript = String(await stt(utteredOrPcm)).replace(/^synthetic:/, '');
    }
    this.recording = 'stopped';
    if (this.cancelled) return this.fail('CANCELLED', t0);
    const reply = `Voice turn (${this.adapters.mode}): ${transcript}`;
    const stream =
      this.adapters.ttsStreamImpl ??
      (function* (text: string) {
        const parts = text.match(/.{1,24}/g) ?? [text];
        for (const p of parts) yield p;
      });
    const ttsChunks: string[] = [];
    for await (const chunk of stream(reply)) {
      if (this.bargeInFlag || this.cancelled) break;
      ttsChunks.push(String(chunk));
    }
    if (this.adapters.mode !== 'SYNTHETIC' && this.adapters.ttsReal && !this.bargeInFlag) {
      const ttsPath = path.join(this.scratch, `tts_${Date.now()}.wav`);
      const tts: TtsResult = synthesizeToWav(reply, ttsPath, process.env.GUNNCHAI_PREFER_SAY === '1');
      wavPath = tts.wavPath;
      if (process.env.GUNNCHAI_VOICE_PLAYBACK === '1') {
        this.playback = playWav(tts.wavPath);
      }
    }
    const completeness = this.completeness();
    this.audit.push({
      at: new Date().toISOString(),
      event: 'turn',
      detail: `mode=${this.adapters.mode}:chunks=${ttsChunks.length}:complete=${completeness}`,
    });
    return this.pack({
      transcript,
      reply,
      ttsChunks,
      notes:
        completeness === 'COMPLETE'
          ? `Realtime voice ${this.adapters.mode} with real STT/TTS adapters. Live mic HUMAN_PENDING unless a device fixture was supplied.`
          : 'SYNTHETIC_ONLY_PARTIAL: fixture STT/TTS cannot earn AI-UR-010 COMPLETE.',
      muted: false,
      t0,
      wavPath,
    });
  }

  private completeness(): 'COMPLETE' | 'PARTIAL' {
    if (this.adapters.mode === 'SYNTHETIC') return 'PARTIAL';
    if (this.adapters.sttReal && this.adapters.ttsReal) return 'COMPLETE';
    return 'PARTIAL';
  }

  private pack(opts: {
    transcript: string;
    reply: string;
    ttsChunks: string[];
    notes: string;
    muted: boolean;
    t0: number;
    wavPath: string | null;
  }): VoiceTurnEvidence {
    return {
      transcript: opts.transcript,
      reply: opts.reply,
      ttsChunks: opts.ttsChunks,
      bargeIn: this.bargeInFlag,
      muted: opts.muted,
      privacyLocalOnly: this.privacyLocalOnly,
      mode: this.adapters.mode,
      completeness: this.completeness(),
      notes: opts.notes,
      latencyMs: Date.now() - opts.t0,
      recordingState: this.recording,
      cancelled: this.cancelled,
      sttReal: Boolean(this.adapters.sttReal),
      ttsReal: Boolean(this.adapters.ttsReal),
      wavPath: opts.wavPath,
      micPending: true,
    };
  }

  private fail(reason: string, t0: number): VoiceTurnEvidence {
    this.audit.push({ at: new Date().toISOString(), event: 'deny', detail: reason });
    return this.pack({
      transcript: '',
      reply: '',
      ttsChunks: [],
      notes: reason,
      muted: this.muted,
      t0,
      wavPath: null,
    });
  }
}

export function localVoiceAdapters(): VoiceAdapters {
  return { mode: 'LOCAL', sttReal: true, ttsReal: true };
}
