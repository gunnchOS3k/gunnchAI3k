/**
 * Digital product completion runtime tests.
 * Real tools / STT-TTS / VLM / computer-use / audio / security.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { CustomAgentStore } from '../../src/user-ready/custom_agents';
import { pcmToWav, synthesizeFormantPcm, transcribeFormantWav, isRealSpeechWav } from '../../src/user-ready/speech_local';
import { localVoiceAdapters, RealtimeVoiceProduct } from '../../src/user-ready/voice_realtime';
import { compareVisionModes, renderVisionFixture } from '../../src/user-ready/vision_vlm';
import { runBenignEditorE2E, recoverAfterCancel } from '../../src/user-ready/computer_use_real';
import { AudioOverviewRuntime } from '../../src/user-ready/audio_overview';
import { renderCompanionChrome } from '../../src/user-ready/companion_ui';
import { runSecurityRegression } from '../../src/product-completion/security_regression';
import { loadTaskMatrix } from '../../src/user-ready/matrix';
import { HUMAN_E6_TOKEN } from '../../src/user-ready/tokens';
import { challengeImplementedFlags, challengeMatrixInflation } from '../../src/user-ready/stub_challenge';

jest.setTimeout(60000);

describe('digital product completion surfaces', () => {
  it('custom agents execute allowlisted tools and fail closed', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-agents-'));
    const store = new CustomAgentStore(dir);
    fs.writeFileSync(path.join(dir, 'read', 'notes.txt'), 'Cyclic prefix absorbs delay spread in OFDM.\n');
    store.install({
      id: 'lab',
      name: 'Lab',
      description: 'lab',
      systemPrompt: 'Use allowlisted tools only please.',
      permissions: ['files.read', 'files.write'],
      tools: ['files'],
      version: '1',
    });
    expect((await store.executeTool('lab', 'local.files.read', { path: 'notes.txt' })).ok).toBe(false);
    store.consent('lab', ['files.read', 'files.write']);
    const read = await store.executeTool('lab', 'local.files.read', { path: 'notes.txt' });
    expect(read.ok).toBe(true);
    expect(String(read.output.text)).toMatch(/Cyclic prefix/);
    const escape = await store.executeTool('lab', 'local.files.read', { path: '../../etc/passwd' });
    expect(escape.ok).toBe(false);
    const calc = await store.executeTool('lab', 'calc.evaluate', { expr: '(2+3)*4' });
    expect(calc.ok).toBe(true);
    expect(calc.output.value).toBe(20);
  });

  it('formant STT/TTS is real speech WAV and does not echo source text into STT', () => {
    const wav = pcmToWav(synthesizeFormantPcm('cyclic prefix'));
    expect(isRealSpeechWav(wav)).toBe(true);
    expect(wav.readUInt16LE(34)).toBe(16);
    const text = transcribeFormantWav(wav);
    expect(text.length).toBeGreaterThan(0);
    expect(/cyclic|prefix/.test(text)).toBe(true);
  });

  it('local voice requires mic, supports mute/barge-in/cancel', async () => {
    const v = new RealtimeVoiceProduct('u', localVoiceAdapters());
    expect((await v.turn('cyclic prefix')).notes).toMatch(/MIC/);
    v.grantMic();
    v.requestMic();
    const wavPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'pc-v-')), 'c.wav');
    fs.writeFileSync(wavPath, pcmToWav(synthesizeFormantPcm('cyclic prefix')));
    const t = await v.turn(wavPath);
    expect(t.mode).toBe('LOCAL');
    expect(t.sttReal).toBe(true);
    expect(t.ttsReal).toBe(true);
    expect(t.completeness).toBe('COMPLETE');
    v.mute();
    expect((await v.turn(wavPath)).muted).toBe(true);
    v.unmute();
    v.bargeIn();
    expect((await v.turn(wavPath)).bargeIn).toBe(true);
    v.cancel();
    expect((await v.turn(wavPath)).cancelled).toBe(true);
  });

  it('VLM_ONLY reads bar chart pixels that OCR_ONLY cannot', () => {
    const { png } = renderVisionFixture('chart');
    const cmp = compareVisionModes(png, 'chart');
    expect(cmp.vlmOnly.nonTextUnderstood).toBe(true);
    expect(cmp.vlmOnly.chart?.bars.length).toBeGreaterThanOrEqual(2);
    expect(cmp.ocrOnly.nonTextUnderstood).toBe(false);
    expect(cmp.rasterSemanticPass).toBe(true);
    const photo = compareVisionModes(renderVisionFixture('photo_object').png, 'photo_object');
    expect(photo.vlmOnly.objects.some((o) => o.color === 'red')).toBe(true);
  });

  it('computer-use lab editor writes a REAL sandbox file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-cu-'));
    const r = runBenignEditorE2E('u', dir);
    expect(r.ok).toBe(true);
    expect(r.realFile).toBe(true);
    expect(r.content).toMatch(/OFDM cyclic prefix/);
    expect(r.content).toMatch(/Revised/);
    expect(recoverAfterCancel('u2', dir)).toBe(true);
  });

  it('audio overview is SOLO_NARRATOR real TTS and rejects ungrounded claims', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-ao-'));
    const ao = new AudioOverviewRuntime(dir);
    ao.attach({
      id: 's1',
      title: 'OFDM',
      text: 'The cyclic prefix absorbs multipath delay spread and keeps subcarriers orthogonal in OFDM.',
    });
    const r = ao.generate('OFDM', ['Dragons invented WiFi on Pluto yesterday']);
    expect(r.ok).toBe(true);
    expect(r.narratorMode).toBe('SOLO_NARRATOR');
    expect(r.realTtsSpeech).toBe(true);
    expect(r.rejectedClaims.some((c) => /Dragons/i.test(c))).toBe(true);
    expect(r.chapters.length).toBeGreaterThan(0);
    expect(r.transcript.length).toBeGreaterThan(20);
    expect(isRealSpeechWav(fs.readFileSync(r.audioPath!))).toBe(true);
  });

  it('companion wires research/notebook/tutor/vision/audio/coding; HUMAN_E6 false', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-cmp-'));
    const chrome = renderCompanionChrome(dir);
    expect(chrome.ok).toBe(true);
    expect(chrome.humanPolishValidated).toBe(false);
    expect(chrome.surfaces.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'research',
        'notebook',
        'waike_tutor',
        'vision',
        'audio_overview',
        'coding_agent',
        'memory',
        'voice',
      ]),
    );
    const html = fs.readFileSync(chrome.htmlPath!, 'utf8');
    expect(html).toMatch(/active model/);
    expect(html).toMatch(/stop\/cancel/);
  });

  it('security regression fail-closed', async () => {
    const sec = await runSecurityRegression();
    const failed = sec.cases.filter((c) => !c.passed);
    expect(failed).toEqual([]);
    expect(sec.ok).toBe(true);
  });

  it('matrix has no OPEN and HUMAN_E6 stays false', () => {
    const matrix = loadTaskMatrix();
    expect(challengeImplementedFlags(matrix.tasks)).toEqual([]);
    expect(matrix.tasks.filter((t) => t.coverage_status === 'OPEN')).toEqual([]);
    expect(HUMAN_E6_TOKEN).toBe('HUMAN_E6');
    expect(
      challengeMatrixInflation(matrix.tasks, {
        agentsRealToolExecution: true,
        computerUseRealOsAutomation: true,
        audioRealTtsSpeech: true,
        companionButtonBackendWired: true,
        voiceRealSpeechBackends: true,
        visionNeuralVlm: false,
        visionSemanticRaster: true,
      }),
    ).toEqual([]);
  });
});
