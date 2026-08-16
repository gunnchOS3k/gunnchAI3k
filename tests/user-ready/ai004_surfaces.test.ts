/**
 * AI-USER-READY-004 surface unit tests (008/009/010/012/014/015 + Local Pro audit honesty).
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AudioOverviewRuntime } from '../../src/user-ready/audio_overview';
import { renderCompanionChrome } from '../../src/user-ready/companion_ui';
import { SafeComputerUseRuntime } from '../../src/user-ready/computer_use_safe';
import { CustomAgentStore } from '../../src/user-ready/custom_agents';
import { CowriteWorkspace } from '../../src/user-ready/cowrite_workspace';
import { auditLocalPro } from '../../src/user-ready/local_pro_audit';
import { loadTaskMatrix } from '../../src/user-ready/matrix';
import { challengeImplementedFlags, challengeMatrixInflation, challengeUserReady004 } from '../../src/user-ready/stub_challenge';
import { VISUAL_UNAVAILABLE } from '../../src/user-ready/tokens';
import { RealtimeVoiceProduct } from '../../src/user-ready/voice_realtime';

describe('AI-USER-READY-004 surfaces', () => {
  it('matrix is 11 COMPLETE / 5 PARTIAL / 0 OPEN after companion wiring', () => {
    const matrix = loadTaskMatrix();
    expect(matrix.packet).toBe('AI-USER-READY-004');
    expect(challengeImplementedFlags(matrix.tasks)).toEqual([]);
    const complete = matrix.tasks.filter((t) => t.coverage_status === 'COMPLETE').map((t) => t.task_id);
    const partial = matrix.tasks.filter((t) => t.coverage_status === 'PARTIAL').map((t) => t.task_id);
    const open = matrix.tasks.filter((t) => t.coverage_status === 'OPEN').map((t) => t.task_id);
    expect(complete.length).toBe(11);
    expect(partial.sort()).toEqual([
      'AI-UR-009',
      'AI-UR-010',
      'AI-UR-011',
      'AI-UR-012',
      'AI-UR-014',
    ]);
    expect(open).toEqual([]);
    expect(complete).toEqual(
      expect.arrayContaining([
        'AI-UR-001',
        'AI-UR-002',
        'AI-UR-003',
        'AI-UR-004',
        'AI-UR-005',
        'AI-UR-006',
        'AI-UR-007',
        'AI-UR-008',
        'AI-UR-013',
        'AI-UR-015',
        'AI-UR-016',
      ]),
    );
    expect(complete).not.toContain('AI-UR-009');
    expect(complete).not.toContain('AI-UR-012');
    expect(complete).not.toContain('AI-UR-014');
  });

  it('author bar rejects inflated COMPLETE for template/mock/sine/static stacks', () => {
    const inflated = [
      { task_id: 'AI-UR-009', coverage_status: 'COMPLETE' },
      { task_id: 'AI-UR-012', coverage_status: 'COMPLETE' },
      { task_id: 'AI-UR-014', coverage_status: 'COMPLETE' },
      { task_id: 'AI-UR-015', coverage_status: 'COMPLETE' },
    ];
    expect(
      challengeMatrixInflation(inflated, {
        agentsRealToolExecution: false,
        computerUseRealOsAutomation: false,
        audioRealTtsSpeech: false,
        companionButtonBackendWired: false,
        voiceRealSpeechBackends: false,
        visionNeuralVlm: false,
      }),
    ).toEqual(
      expect.arrayContaining([
        'MATRIX_INFLATION:AI-UR-009_TEMPLATE_INVOKE',
        'MATRIX_INFLATION:AI-UR-012_A11Y_MOCK',
        'MATRIX_INFLATION:AI-UR-014_SINE_WAV',
        'MATRIX_INFLATION:AI-UR-015_STATIC_HTML',
      ]),
    );
    const honest = loadTaskMatrix().tasks;
    expect(
      challengeMatrixInflation(honest, {
        agentsRealToolExecution: false,
        computerUseRealOsAutomation: false,
        audioRealTtsSpeech: false,
        companionButtonBackendWired: true,
        voiceRealSpeechBackends: false,
        visionNeuralVlm: false,
      }),
    ).toEqual([]);
  });

  it('cowrite create/edit/persist/reopen with provenance; rejects silent overwrite', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ur004-cowrite-'));
    const ws = new CowriteWorkspace(dir);
    const doc = ws.create('u', 'T', 'v1 body with enough text');
    expect(ws.edit('u', doc.id, 'v2 body with enough text', 1).ok).toBe(true);
    expect(ws.edit('u', doc.id, 'stale', 1).ok).toBe(false);
    expect(() => ws.silentOverwrite('u', doc.id, 'x')).toThrow(/SILENT_OVERWRITE/);
    const again = ws.reopen('u', doc.id);
    expect(again?.version).toBe(2);
    expect(again?.provenance.some((p) => p.op === 'reject_overwrite')).toBe(true);
  });

  it('custom agents fail-closed; unrestricted rejected', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ur004-agents-'));
    const store = new CustomAgentStore(dir);
    expect(
      store.install({
        id: 'x',
        name: 'X',
        description: 'x',
        systemPrompt: 'Be helpful locally always.',
        permissions: ['shell.exec'],
        tools: [],
        version: '1',
        unrestricted: true,
      }).ok,
    ).toBe(false);
    expect(
      store.install({
        id: 'tutor',
        name: 'Tutor',
        description: 'tutor',
        systemPrompt: 'Teach with hints only please.',
        permissions: ['files.read'],
        tools: ['files'],
        version: '1',
      }).ok,
    ).toBe(true);
    expect(store.invoke('tutor', 'hi', ['files.read']).ok).toBe(false);
    store.consent('tutor', ['files.read']);
    expect(store.invoke('tutor', 'hi there OFDM', ['files.read']).ok).toBe(true);
  });

  it('synthetic voice stays PARTIAL; mic/mute/barge-in work', async () => {
    const v = new RealtimeVoiceProduct('u', { mode: 'SYNTHETIC' });
    const denied = await v.turn('x');
    expect(denied.notes).toMatch(/MIC/);
    v.grantMic();
    v.requestMic();
    const t = await v.turn('hello cyclic prefix');
    expect(t.completeness).toBe('PARTIAL');
    expect(t.ttsChunks.length).toBeGreaterThan(0);
    v.bargeIn();
    const b = await v.turn('longer utterance for streaming text chunks here');
    expect(b.bargeIn).toBe(true);
    v.mute();
    expect((await v.turn('nope')).muted).toBe(true);
  });

  it('computer use allowlist + cancel; blocks finance/medical', () => {
    const cu = new SafeComputerUseRuntime('u');
    expect(cu.attachEnv('production.finance.desk').ok).toBe(false);
    expect(cu.attachEnv('medical.ehr').ok).toBe(false);
    expect(cu.attachEnv('lab.local.test-ui').ok).toBe(true);
    expect(
      cu.run([{ type: 'click', target: { role: 'button', name: 'A' } }], [
        { role: 'button', name: 'A' },
      ]).ok,
    ).toBe(false);
    cu.grantDesktopControl();
    expect(
      cu.run([{ type: 'click', target: { role: 'button', name: 'A' } }], [
        { role: 'button', name: 'A', value: 'ok' },
      ]).ok,
    ).toBe(true);
    cu.cancel();
    expect(
      cu.run([{ type: 'click', target: { role: 'button', name: 'A' } }], [
        { role: 'button', name: 'A' },
      ]).reason,
    ).toBe('CANCELLED');
  });

  it('audio overview grounds script and rejects hallucinations', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ur004-audio-'));
    const ao = new AudioOverviewRuntime(dir);
    ao.attach({
      id: 's1',
      title: 'OFDM',
      text: 'The cyclic prefix absorbs multipath delay spread and keeps subcarriers orthogonal in OFDM.',
    });
    const r = ao.generate('OFDM', ['Dragons invented WiFi on Pluto yesterday']);
    expect(r.ok).toBe(true);
    expect(r.rejectedClaims.some((c) => /Dragons/i.test(c))).toBe(true);
    expect(r.script.every((l) => l.citations.length > 0)).toBe(true);
    expect(r.audioPath && fs.existsSync(r.audioPath)).toBe(true);
    expect(fs.readFileSync(r.audioPath!).subarray(0, 4).toString()).toBe('RIFF');
  });

  it('companion chrome buttons wire to backend; HUMAN polish false', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ur004-comp-'));
    const chrome = renderCompanionChrome(dir);
    expect(chrome.ok).toBe(true);
    expect(chrome.humanPolishValidated).toBe(false);
    expect(chrome.buttonBackendWired).toBe(true);
    expect(chrome.pixels).toBe(VISUAL_UNAVAILABLE);
    expect(chrome.surfaces.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'conversation',
        'workspace',
        'skills',
        'memory',
        'voice',
        'computer_use_consent',
        'privacy',
        'offline',
      ]),
    );
    const html = fs.readFileSync(chrome.htmlPath!, 'utf8');
    expect(html).toMatch(/data-action="send"/);
    expect(html).toMatch(/__gunnchaiCompanionDispatch/);
    expect(fs.existsSync(path.join(dir, 'companion_button_backend_map.json'))).toBe(true);
  });

  it('Local Pro audit does not fake HOST_OBSERVED without weights', async () => {
    const audit = await auditLocalPro(process.cwd(), { networkConsent: false });
    expect(audit.observation).toBeNull();
    expect(audit.status).not.toBe('HOST_OBSERVED');
    expect(audit.status).toMatch(/LOCAL_PRO_RESOURCE_PENDING|OPEN|ABSENT/);
    expect(
      challengeUserReady004({
        silentCowriteOverwrite: false,
        unrestrictedAgentInstalled: false,
        syntheticVoiceClaimedComplete: false,
        ocrHeuristicClaimedComplete: false,
        computerUseOutsideAllowlist: false,
        audioOverviewHallucinated: false,
        humanPolishWithoutHuman: false,
        fakeLocalProHostObserved: false,
        agentsTemplateClaimedComplete: false,
        computerUseMockClaimedComplete: false,
        audioSineWavClaimedComplete: false,
        companionStaticHtmlClaimedComplete: false,
      }),
    ).toEqual([]);
  });
});
