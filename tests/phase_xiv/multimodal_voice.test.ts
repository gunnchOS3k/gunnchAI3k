import * as fs from 'node:fs';
import * as path from 'node:path';
import { VisionRuntime, ScreenAwareness, RealtimeVoiceRuntime } from '../../src/phase_xiv';

describe('phase_xiv multimodal + voice', () => {
  it('gates vision and screen on permissions', () => {
    const vision = new VisionRuntime();
    const screen = new ScreenAwareness();
    const img = path.join(process.cwd(), 'artifacts', 'phase_xiv', 'eval', 'sample.svg');
    fs.mkdirSync(path.dirname(img), { recursive: true });
    fs.writeFileSync(img, '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3"/></svg>');
    expect(vision.describeImage('u1', img).ok).toBe(false);
    vision.getPermissions().grant('u1', 'file');
    expect(vision.describeImage('u1', img).ok).toBe(true);
    expect(screen.captureActive('u1').ok).toBe(false);
    screen.getPermissions().grant('u1', 'screen');
    expect(screen.captureActive('u1', { title: 'Editor', text: 'error TS2345' }).text_excerpt).toContain('TS2345');
  });

  it('supports ASR/TTS/barge-in and prepares high-impact voice actions', () => {
    const voice = new RealtimeVoiceRuntime();
    expect(() => voice.startSession('u1')).toThrow(/MIC_PERMISSION/);
    voice.getPermissions().grant('u1', 'mic');
    const s = voice.startSession('u1');
    voice.bargeIn(s.id);
    const turn = voice.handleTurn(s.id, 'please submit my assignment', 'submit');
    expect(turn.interrupted).toBe(true);
    expect(turn.prepared_approval_id).toBeTruthy();
    expect(voice.approvals.list('pending')[0].action).toBe('submit');
    expect(s.asr_backend).toBe('local_open_asr');
  });
});
