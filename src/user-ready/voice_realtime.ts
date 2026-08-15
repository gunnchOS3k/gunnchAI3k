/**
 * AI-UR-010 Realtime voice: mic permission → STT → turn → streaming TTS.
 * Barge-in / mute / privacy. LOCAL vs PROVIDER vs SYNTHETIC.
 * Synthetic-only adapters cannot earn COMPLETE.
 */

import { PermissionBroker } from '../stage2/os/permissions';

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
}

export class RealtimeVoiceProduct {
  readonly permissions = new PermissionBroker();
  readonly audit: VoiceAuditEntry[] = [];
  private muted = false;
  private bargeInFlag = false;
  private sessionActive = false;
  private privacyLocalOnly = true;

  constructor(
    private readonly userId: string,
    private readonly adapters: VoiceAdapters,
  ) {}

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
    this.audit.push({ at: new Date().toISOString(), event: 'barge_in', detail: 'interrupt_tts' });
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
    if (this.muted) {
      this.audit.push({ at: new Date().toISOString(), event: 'turn_skipped', detail: 'muted' });
      return {
        transcript: '',
        reply: '',
        ttsChunks: [],
        bargeIn: this.bargeInFlag,
        muted: true,
        privacyLocalOnly: this.privacyLocalOnly,
        mode: this.adapters.mode,
        completeness: this.completeness(),
        notes: 'MUTED',
        latencyMs: Date.now() - t0,
      };
    }

    const stt =
      this.adapters.sttImpl ??
      ((s: string) => (this.adapters.mode === 'SYNTHETIC' ? `synthetic:${s}` : s));
    const transcript = String(await stt(utteredOrPcm)).replace(/^synthetic:/, '');
    const reply = `Voice turn (${this.adapters.mode}): ${transcript}`;
    const stream =
      this.adapters.ttsStreamImpl ??
      (function* (text: string) {
        const parts = text.match(/.{1,24}/g) ?? [text];
        for (const p of parts) yield p;
      });
    const ttsChunks: string[] = [];
    for await (const chunk of stream(reply)) {
      if (this.bargeInFlag) break;
      ttsChunks.push(String(chunk));
    }
    const completeness = this.completeness();
    this.audit.push({
      at: new Date().toISOString(),
      event: 'turn',
      detail: `mode=${this.adapters.mode}:chunks=${ttsChunks.length}:complete=${completeness}`,
    });
    return {
      transcript,
      reply,
      ttsChunks,
      bargeIn: this.bargeInFlag,
      muted: false,
      privacyLocalOnly: this.privacyLocalOnly,
      mode: this.adapters.mode,
      completeness,
      notes:
        completeness === 'COMPLETE'
          ? `Realtime voice ${this.adapters.mode} with real STT/TTS adapters.`
          : 'SYNTHETIC_ONLY_PARTIAL: fixture STT/TTS cannot earn AI-UR-010 COMPLETE.',
      latencyMs: Date.now() - t0,
    };
  }

  private completeness(): 'COMPLETE' | 'PARTIAL' {
    if (this.adapters.mode === 'SYNTHETIC') return 'PARTIAL';
    if (this.adapters.sttReal && this.adapters.ttsReal) return 'COMPLETE';
    return 'PARTIAL';
  }

  private fail(reason: string, t0: number): VoiceTurnEvidence {
    this.audit.push({ at: new Date().toISOString(), event: 'deny', detail: reason });
    return {
      transcript: '',
      reply: '',
      ttsChunks: [],
      bargeIn: this.bargeInFlag,
      muted: this.muted,
      privacyLocalOnly: this.privacyLocalOnly,
      mode: this.adapters.mode,
      completeness: this.completeness(),
      notes: reason,
      latencyMs: Date.now() - t0,
    };
  }
}
