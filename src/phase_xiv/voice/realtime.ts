/**
 * Real-time voice path with local/open-runtime markers, ASR/TTS/barge-in.
 * High-impact intents prepare only — approval still required.
 */

import { ApprovalGate, isHighImpact, type HighImpactAction } from '../agent/approval';
import { PermissionBroker } from '../../stage2/os/permissions';

export type VoiceBackend = 'local_open_asr' | 'local_open_tts' | 'external_pending';

export interface VoiceSession {
  id: string;
  duplex: boolean;
  barge_in: boolean;
  asr_backend: VoiceBackend;
  tts_backend: VoiceBackend;
  partial_transcript: string;
  interrupted: boolean;
}

export interface VoiceTurnResult {
  transcript: string;
  tts_text: string;
  interrupted: boolean;
  prepared_approval_id: string | null;
  latency_ms: number;
}

export class RealtimeVoiceRuntime {
  readonly approvals = new ApprovalGate();
  private sessions = new Map<string, VoiceSession>();
  private seq = 0;

  constructor(private readonly permissions = new PermissionBroker()) {}

  getPermissions(): PermissionBroker {
    return this.permissions;
  }

  startSession(user_id: string): VoiceSession {
    if (this.permissions.check(user_id, 'mic') !== 'granted') {
      throw new Error('MIC_PERMISSION_DENIED');
    }
    this.seq += 1;
    const session: VoiceSession = {
      id: `voice_${this.seq}`,
      duplex: true,
      barge_in: true,
      asr_backend: 'local_open_asr',
      tts_backend: 'local_open_tts',
      partial_transcript: '',
      interrupted: false,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Simulate ASR on a local audio fixture path or raw text stand-in. */
  asr(session_id: string, uttered: string): string {
    const s = this.sessions.get(session_id);
    if (!s) throw new Error('UNKNOWN_VOICE_SESSION');
    s.partial_transcript = uttered;
    return uttered;
  }

  tts(session_id: string, text: string): { backend: VoiceBackend; bytes_est: number } {
    const s = this.sessions.get(session_id);
    if (!s) throw new Error('UNKNOWN_VOICE_SESSION');
    return { backend: s.tts_backend, bytes_est: Buffer.byteLength(text, 'utf8') };
  }

  bargeIn(session_id: string): void {
    const s = this.sessions.get(session_id);
    if (!s) throw new Error('UNKNOWN_VOICE_SESSION');
    s.interrupted = true;
    s.barge_in = true;
  }

  handleTurn(session_id: string, uttered: string, intentAction?: string): VoiceTurnResult {
    const t0 = Date.now();
    const transcript = this.asr(session_id, uttered);
    let prepared: string | null = null;
    if (intentAction && isHighImpact(intentAction)) {
      const req = this.approvals.prepare(intentAction as HighImpactAction, `voice:${transcript}`, {
        source: 'voice',
      });
      prepared = req.id;
    }
    const reply = prepared
      ? `Prepared ${intentAction} — waiting for approval.`
      : `Heard: ${transcript}`;
    this.tts(session_id, reply);
    const s = this.sessions.get(session_id)!;
    return {
      transcript,
      tts_text: reply,
      interrupted: s.interrupted,
      prepared_approval_id: prepared,
      latency_ms: Date.now() - t0,
    };
  }
}
