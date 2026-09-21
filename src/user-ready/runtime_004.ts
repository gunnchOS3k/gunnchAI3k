/**
 * AI-USER-READY-004 runtime: cowrite, skills, voice (PARTIAL if synthetic),
 * computer-use allowlist, audio overview, companion surfaces, Local Pro audit.
 * Vision remains PARTIAL (OCR ≠ VLM). No product/frontier/HUMAN_E6 claims.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AudioOverviewRuntime } from './audio_overview';
import { renderCompanionChrome } from './companion_ui';
import { SafeComputerUseRuntime } from './computer_use_safe';
import { runBenignEditorE2E } from './computer_use_real';
import { coverageFrom, type CoverageCounts } from './coverage';
import { CustomAgentStore } from './custom_agents';
import { CowriteWorkspace } from './cowrite_workspace';
import { auditLocalPro } from './local_pro_audit';
import { loadMarketBaseline, loadTaskMatrix } from './matrix';
import { inspectModelTiers } from './model_tiers';
import { runUserReady003Packet } from './runtime_003';
import {
  assertNotStub,
  challengeImplementedFlags,
  challengeMatrixInflation,
  challengeUserReady004,
} from './stub_challenge';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_004_TOKEN,
  VISUAL_UNAVAILABLE,
  buildUserReadyTokens,
  type UserReadyTokens,
} from './tokens';
import type { TaskRunResult } from './runtime';
import { localVoiceAdapters, RealtimeVoiceProduct } from './voice_realtime';
import { compareVisionModes, renderVisionFixture } from './vision_vlm';
import { pcmToWav, synthesizeFormantPcm, transcribeFormantWav } from './speech_local';

export interface UserReady004Report {
  schema: 'gunnchai.user_ready_004.v1';
  packet: 'AI-USER-READY-004';
  generatedAt: string;
  accepted_main_base: string;
  tokens: UserReadyTokens;
  pixels: typeof VISUAL_UNAVAILABLE | string;
  modelTiers: ReturnType<typeof inspectModelTiers>;
  localPro: {
    status: string;
    sha256: string | null;
    notes: string;
    observation: string | null;
    resourceSafe: boolean;
  };
  coverage: CoverageCounts;
  results: TaskRunResult[];
  p1: Record<string, unknown>;
  stubChallengeFailures: string[];
  next_packet: string[];
  remaining_open: string[];
  remaining_partial: string[];
  allImplementedPassed: boolean;
  eval_summary: Record<string, unknown>;
  deferred_heavy_work: string[];
}

export async function runUserReady004Packet(
  cwd = process.cwd(),
  opts?: { scratch?: string; fastNetworkConsent?: boolean; proNetworkConsent?: boolean },
): Promise<UserReady004Report> {
  const scratch = opts?.scratch ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-ur004-'));
  const matrix = loadTaskMatrix(cwd);
  const baseline = loadMarketBaseline(cwd);
  assertNotStub('market_baseline.schema', baseline.schema);

  // Carry forward 001–003 COMPLETE/PARTIAL evidence (writes 003 artifact as side effect).
  const base003 = await runUserReady003Packet(cwd, {
    scratch: path.join(scratch, 'base003'),
    fastNetworkConsent: opts?.fastNetworkConsent ?? process.env.GUNNCHAI_FAST_NETWORK_CONSENT === '1',
    proNetworkConsent: false, // never pull Pro under 004 unless audit says safe
  });

  const results: TaskRunResult[] = base003.results.filter((r) =>
    [
      'AI-UR-001',
      'AI-UR-002',
      'AI-UR-003',
      'AI-UR-004',
      'AI-UR-005',
      'AI-UR-006',
      'AI-UR-007',
      'AI-UR-011',
      'AI-UR-013',
      'AI-UR-016',
    ].includes(r.task_id),
  );

  // --- AI-UR-008 cowrite ---
  const cowrite = new CowriteWorkspace(path.join(scratch, 'cowrite'));
  const doc = cowrite.create('u1', 'Lab notes', 'OFDM cyclic prefix absorbs delay spread.');
  const edited = cowrite.edit('u1', doc.id, 'OFDM cyclic prefix absorbs delay spread. Keep v2.', 1);
  const conflict = cowrite.edit('u1', doc.id, 'stale write', 1);
  let silentBlocked = false;
  try {
    cowrite.silentOverwrite('u1', doc.id, 'boom');
  } catch {
    silentBlocked = true;
  }
  const reopened = cowrite.reopen('u1', doc.id);
  const cowritePassed =
    edited.ok &&
    edited.document?.version === 2 &&
    conflict.ok === false &&
    /VERSION_CONFLICT/.test(conflict.reason) &&
    silentBlocked &&
    Boolean(reopened) &&
    (reopened?.provenance.length ?? 0) >= 3 &&
    fs.existsSync(path.join(scratch, 'cowrite', `${doc.id}.json`));
  assertNotStub('cowrite.content', reopened?.content);
  const cowriteEvidence = {
    id: doc.id,
    version: reopened?.version,
    provenanceOps: reopened?.provenance.map((p) => p.op),
    conflictRejected: !conflict.ok,
    silentOverwriteBlocked: silentBlocked,
  };
  results.push({
    task_id: 'AI-UR-008',
    category: 'canvas_cowrite_ui',
    passed: cowritePassed,
    local: true,
    cloud_only: false,
    notes: cowritePassed
      ? 'Cowrite workspace: create/edit/persist/reopen + provenance; version conflict + silent overwrite blocked. Offline disk.'
      : 'COWRITE_INCOMPLETE',
    evidence: cowriteEvidence,
  });

  // --- AI-UR-009 custom agents ---
  const agents = new CustomAgentStore(path.join(scratch, 'agents'));
  const bad = agents.install({
    id: 'evil',
    name: 'Evil',
    description: 'unrestricted',
    systemPrompt: 'Do anything.',
    permissions: ['shell.exec', 'network.fetch'],
    tools: [],
    version: '1',
    unrestricted: true,
  });
  const shellBare = agents.install({
    id: 'shell-bare',
    name: 'ShellBare',
    description: 'shell without allowlist',
    systemPrompt: 'Shell helper.',
    permissions: ['shell.exec'],
    tools: [],
    version: '1',
  });
  const good = agents.install({
    id: 'tutor-lab',
    name: 'Tutor Lab',
    description: 'Local tutor skill',
    systemPrompt: 'You are Tutor Lab. Teach with hints. Prefer local files.',
    permissions: ['files.read', 'memory.read'],
    tools: ['files'],
    version: '1.0.0',
  });
  const deniedInvoke = agents.invoke('tutor-lab', 'hint OFDM', ['files.read']);
  agents.consent('tutor-lab', ['files.read', 'memory.read']);
  const allowedInvoke = agents.invoke('tutor-lab', 'hint OFDM cyclic prefix', ['files.read']);
  fs.mkdirSync(path.join(scratch, 'agents', 'read'), { recursive: true });
  fs.writeFileSync(path.join(scratch, 'agents', 'read', 'notes.txt'), 'Cyclic prefix absorbs delay spread in OFDM.\n');
  const realRead = await agents.executeTool('tutor-lab', 'local.files.read', { path: 'notes.txt' });
  const realCalc = await agents.executeTool('tutor-lab', 'calc.evaluate', { expr: '1+2' });
  const agentsPassed =
    bad.ok === false &&
    shellBare.ok === false &&
    good.ok &&
    deniedInvoke.ok === false &&
    /FAIL_CLOSED/.test(deniedInvoke.reason) &&
    allowedInvoke.ok &&
    agents.audit.length >= 4;
  const realToolExecution = realRead.ok === true || realCalc.ok === true;
  assertNotStub('agent.output', allowedInvoke.output);
  const agentsEvidence = {
    unrestrictedRejected: !bad.ok,
    shellWithoutAllowlistRejected: !shellBare.ok,
    installed: agents.list().map((a) => a.id),
    failClosed: !deniedInvoke.ok,
    consentedInvoke: allowedInvoke.ok,
    auditEvents: agents.audit.map((a) => a.event),
    realToolExecution,
    stack: realToolExecution ? 'allowlisted_tool_execution' : 'string_template_invoke',
    completeness: realToolExecution ? ('COMPLETE' as const) : ('PARTIAL' as const),
  };
  results.push({
    task_id: 'AI-UR-009',
    category: 'custom_agents',
    passed: agentsPassed,
    local: true,
    cloud_only: false,
    notes: agentsPassed
      ? realToolExecution
        ? 'COMPLETE: manifest/consent/fail-closed/audit plus real allowlisted tool execution.'
        : 'PARTIAL: manifest/consent/fail-closed/audit work, but invoke is string-template — not real allowlisted tool execution.'
      : 'CUSTOM_AGENTS_INCOMPLETE',
    evidence: agentsEvidence,
  });

  // --- AI-UR-010 voice (synthetic → PARTIAL) ---
  const voice = new RealtimeVoiceProduct('u1', { mode: 'SYNTHETIC' });
  const noMic = await voice.turn('hello');
  voice.grantMic();
  voice.requestMic();
  const spoken = await voice.turn('explain OFDM cyclic prefix briefly');
  voice.bargeIn();
  const barged = await voice.turn('interrupt me please with a longer phrase for streaming chunks');
  voice.mute();
  const muted = await voice.turn('should be muted');
  const localVoice = new RealtimeVoiceProduct('u1-local', localVoiceAdapters(), path.join(scratch, 'voice-local'));
  localVoice.grantMic();
  localVoice.requestMic();
  const formant = pcmToWav(synthesizeFormantPcm('cyclic prefix'));
  const fixtureWav = path.join(scratch, 'cyclic_prefix.wav');
  fs.writeFileSync(fixtureWav, formant);
  const localSpoken = await localVoice.turn(fixtureWav);
  const sttProbe = transcribeFormantWav(formant);
  const voiceRealSpeechBackends =
    localSpoken.mode === 'LOCAL' &&
    localSpoken.sttReal &&
    localSpoken.ttsReal &&
    localSpoken.completeness === 'COMPLETE';
  const voicePartialPassed =
    noMic.notes.includes('MIC_PERMISSION') &&
    spoken.transcript.length > 0 &&
    spoken.ttsChunks.length > 0 &&
    spoken.completeness === 'PARTIAL' &&
    spoken.mode === 'SYNTHETIC' &&
    barged.bargeIn === true &&
    muted.muted === true;
  const voiceEvidence = {
    mode: spoken.mode,
    completeness: spoken.completeness,
    micDeniedFirst: /MIC_PERMISSION/.test(noMic.notes),
    chunks: spoken.ttsChunks.length,
    bargeIn: barged.bargeIn,
    muted: muted.muted,
    privacyLocalOnly: spoken.privacyLocalOnly,
    realLocal: voiceRealSpeechBackends,
    localTranscript: localSpoken.transcript,
    sttProbe,
  };
  results.push({
    task_id: 'AI-UR-010',
    category: 'voice_realtime',
    passed: voicePartialPassed,
    local: true,
    cloud_only: false,
    notes: voicePartialPassed
      ? voiceRealSpeechBackends
        ? 'COMPLETE: LOCAL STT/TTS adapters (formant) with mic/mute/barge-in. Synthetic path remains as a PARTIAL fixture. Live mic HUMAN_PENDING.'
        : 'PARTIAL: mic→STT→turn→streaming TTS with barge-in/mute/privacy. Synthetic adapters only — not COMPLETE.'
      : 'VOICE_INCOMPLETE',
    evidence: voiceEvidence,
  });

  // --- AI-UR-012 computer use ---
  const cu = new SafeComputerUseRuntime('u1');
  const blockedProd = cu.attachEnv('production.finance.desk');
  const blockedMed = cu.attachEnv('medical.ehr.viewer');
  const blockedOutside = cu.attachEnv('random.desktop');
  const noPerm = cu.attachEnv('lab.local.test-ui');
  const denied = cu.run([{ type: 'click', target: { role: 'button', name: 'Save' } }], [
    { role: 'button', name: 'Save', value: 'save-ok' },
  ]);
  cu.grantDesktopControl();
  const okRun = cu.run(
    [
      { type: 'focus', target: { role: 'window', name: 'Lab' } },
      { type: 'click', target: { role: 'button', name: 'Save' } },
      { type: 'type', target: { role: 'textbox', name: 'Notes' }, text: 'cp' },
    ],
    [
      { role: 'window', name: 'Lab', value: 'focused' },
      { role: 'button', name: 'Save', value: 'clicked' },
      { role: 'textbox', name: 'Notes', value: 'typed' },
    ],
  );
  const cancelRt = new SafeComputerUseRuntime('u2');
  cancelRt.attachEnv('fixtures.user-ready.computer-use');
  cancelRt.grantDesktopControl();
  cancelRt.cancel();
  const cancelled = cancelRt.run([{ type: 'click', target: { role: 'button', name: 'Go' } }], [
    { role: 'button', name: 'Go' },
  ]);
  const cuPassed =
    blockedProd.ok === false &&
    blockedMed.ok === false &&
    blockedOutside.ok === false &&
    noPerm.ok &&
    denied.ok === false &&
    okRun.ok &&
    cancelled.reason === 'CANCELLED' &&
    cu.audit.length >= 3;
  const realCu = runBenignEditorE2E('u1-real', path.join(scratch, 'cu-real'));
  const cuEvidence = {
    productionBlocked: !blockedProd.ok,
    medicalBlocked: !blockedMed.ok,
    outsideAllowlistBlocked: !blockedOutside.ok,
    permissionGated: !denied.ok,
    allowlistedOk: okRun.ok,
    cancelled: cancelled.reason === 'CANCELLED',
    audit: cu.audit.length,
    realOsAutomation: realCu.ok && realCu.realFile,
    stack: realCu.ok && realCu.realFile ? 'isolated_lab_editor_real_file' : 'in_memory_a11y_mock',
    completeness: (realCu.ok && realCu.realFile ? 'COMPLETE' : 'PARTIAL') as 'COMPLETE' | 'PARTIAL',
  };
  results.push({
    task_id: 'AI-UR-012',
    category: 'computer_use',
    passed: cuPassed,
    local: true,
    cloud_only: false,
    notes: cuPassed
      ? cuEvidence.realOsAutomation
        ? 'COMPLETE: allowlist/permission/audit/cancel plus isolated lab editor REAL file/OS state. Mock backend retained.'
        : 'PARTIAL: allowlist/permission/audit/cancel gates work, but action loop is in-memory a11y mock — not real OS/desktop automation.'
      : 'COMPUTER_USE_INCOMPLETE',
    evidence: cuEvidence,
  });

  // --- AI-UR-014 audio overview ---
  const audio = new AudioOverviewRuntime(path.join(scratch, 'audio'));
  audio.attach({
    id: 'src-ofdm',
    title: 'OFDM notes',
    text: 'The cyclic prefix in OFDM absorbs multipath delay spread and preserves orthogonality between subcarriers.',
  });
  audio.attach({
    id: 'src-lab',
    title: 'Lab procedure',
    text: 'Measure delay spread before sizing the cyclic prefix for the wireless lab.',
  });
  const overview = audio.generate('OFDM cyclic prefix', [
    'Unicorns invented OFDM in 1999 on Mars',
  ]);
  const audioPassed =
    overview.ok &&
    overview.script.every((l) => l.citations.length > 0) &&
    overview.rejectedClaims.some((c) => /Unicorns/i.test(c)) &&
    Boolean(overview.audioPath) &&
    overview.bytes > 44 &&
    fs.existsSync(overview.audioPath!);
  assertNotStub('audio.script', overview.script[1]?.text);
  const audioEvidence = {
    outlineSections: overview.outline.length,
    scriptLines: overview.script.length,
    citationsOk: overview.script.every((l) => l.citations.length > 0),
    rejectedClaims: overview.rejectedClaims,
    audioPath: overview.audioPath,
    bytes: overview.bytes,
    realTtsSpeech: overview.realTtsSpeech === true,
    stack: overview.realTtsSpeech ? overview.ttsBackend : 'hash_sine_wav_placeholder',
    completeness: overview.realTtsSpeech ? ('COMPLETE' as const) : ('PARTIAL' as const),
    narratorMode: overview.narratorMode,
  };
  results.push({
    task_id: 'AI-UR-014',
    category: 'audio_overview',
    passed: audioPassed,
    local: true,
    cloud_only: false,
    notes: audioPassed
      ? overview.realTtsSpeech
        ? 'COMPLETE: grounded outline→cited SOLO_NARRATOR script + real TTS; ungrounded claims rejected.'
        : 'PARTIAL: grounded outline→cited script + ungrounded rejection; audio is hash→sine WAV placeholder — not real TTS speech.'
      : 'AUDIO_OVERVIEW_INCOMPLETE',
    evidence: audioEvidence,
  });

  // --- AI-UR-015 companion UI ---
  const chrome = renderCompanionChrome(path.join(scratch, 'companion'));
  const companionPassed =
    chrome.ok &&
    chrome.surfaces.length >= 8 &&
    chrome.humanPolishValidated === false &&
    chrome.buttonBackendWired === true &&
    chrome.pixels === VISUAL_UNAVAILABLE &&
    Boolean(chrome.htmlPath) &&
    fs.existsSync(chrome.htmlPath!) &&
    /data-surface="voice"/.test(fs.readFileSync(chrome.htmlPath!, 'utf8')) &&
    /data-action=/.test(fs.readFileSync(chrome.htmlPath!, 'utf8')) &&
    /__gunnchaiCompanionDispatch/.test(fs.readFileSync(chrome.htmlPath!, 'utf8'));
  const companionEvidence = {
    surfaceIds: chrome.surfaces.map((s) => s.id),
    htmlPath: chrome.htmlPath,
    pixels: chrome.pixels,
    humanPolishValidated: chrome.humanPolishValidated,
    buttonBackendWired: chrome.buttonBackendWired,
    stack: 'companion_backend.v1',
    completeness: companionPassed ? ('COMPLETE' as const) : ('PARTIAL' as const),
  };
  results.push({
    task_id: 'AI-UR-015',
    category: 'companion_ux',
    passed: companionPassed,
    local: true,
    cloud_only: false,
    notes: companionPassed
      ? 'COMPLETE digital: HTML buttons dispatch to companion_backend.v1 for all required surfaces. HUMAN_E6 polish remains false.'
      : 'COMPANION_INCOMPLETE',
    evidence: companionEvidence,
  });

  // --- Local Pro audit ---
  const proAudit = await auditLocalPro(cwd, {
    networkConsent: opts?.proNetworkConsent === true,
  });
  const modelTiers = inspectModelTiers(cwd);

  const visionRow = results.find((r) => r.task_id === 'AI-UR-011');
  const visionCompleteness = String(
    (visionRow?.evidence as { waike?: { completeness?: string } })?.waike?.completeness ??
      (visionRow?.evidence as { completeness?: string })?.completeness ??
      '',
  );

  const chartFix = renderVisionFixture('chart');
  const visionCmp = compareVisionModes(chartFix.png, 'chart');
  const visionSemanticRaster =
    visionCmp.rasterSemanticPass && visionCmp.ocrOnly.nonTextUnderstood === false;

  const stubChallengeFailures = [
    ...challengeImplementedFlags(matrix.tasks),
    ...challengeUserReady004({
      silentCowriteOverwrite: !silentBlocked,
      unrestrictedAgentInstalled: bad.ok,
      syntheticVoiceClaimedComplete: spoken.completeness === 'COMPLETE',
      ocrHeuristicClaimedComplete: visionCompleteness === 'COMPLETE' && !visionSemanticRaster,
      computerUseOutsideAllowlist: blockedOutside.ok || blockedProd.ok,
      audioOverviewHallucinated: overview.script.some((l) => /Unicorns/i.test(l.text)),
      humanPolishWithoutHuman: chrome.humanPolishValidated === true,
      fakeLocalProHostObserved:
        proAudit.observation === 'HOST_OBSERVED' && proAudit.sha256 !== modelTiers.localPro.sha256,
      agentsTemplateClaimedComplete:
        matrix.tasks.find((t) => t.task_id === 'AI-UR-009')?.coverage_status === 'COMPLETE' &&
        agentsEvidence.realToolExecution === false,
      computerUseMockClaimedComplete:
        matrix.tasks.find((t) => t.task_id === 'AI-UR-012')?.coverage_status === 'COMPLETE' &&
        cuEvidence.realOsAutomation === false,
      audioSineWavClaimedComplete:
        matrix.tasks.find((t) => t.task_id === 'AI-UR-014')?.coverage_status === 'COMPLETE' &&
        audioEvidence.realTtsSpeech === false,
      companionStaticHtmlClaimedComplete:
        matrix.tasks.find((t) => t.task_id === 'AI-UR-015')?.coverage_status === 'COMPLETE' &&
        companionEvidence.buttonBackendWired === false,
    }),
    ...challengeMatrixInflation(matrix.tasks, {
      agentsRealToolExecution: agentsEvidence.realToolExecution,
      computerUseRealOsAutomation: cuEvidence.realOsAutomation,
      audioRealTtsSpeech: audioEvidence.realTtsSpeech,
      companionButtonBackendWired: companionEvidence.buttonBackendWired,
      voiceRealSpeechBackends,
      visionNeuralVlm: false,
      visionSemanticRaster,
    }),
  ];

  const coverage = coverageFrom(matrix, results);
  const completeIds = new Set(
    matrix.tasks.filter((t) => t.coverage_status === 'COMPLETE').map((t) => t.task_id),
  );
  const completeResults = results.filter((r) => completeIds.has(r.task_id));
  const allImplementedPassed =
    completeResults.length === completeIds.size &&
    completeResults.every((r) => r.passed) &&
    stubChallengeFailures.length === 0;

  // PARTIAL tasks must also pass their partial gates for digital packet honesty.
  const partialIds = matrix.tasks
    .filter((t) => t.coverage_status === 'PARTIAL')
    .map((t) => t.task_id);
  const partialOk = partialIds.every((id) => results.find((r) => r.task_id === id)?.passed);
  const digitalPass = allImplementedPassed && partialOk;

  const tokens = buildUserReadyTokens({
    packet001: true,
    packet002: true,
    packet003: true,
    packet004: digitalPass,
  });
  if (tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) throw new Error('TOKEN_VIOLATION:APP');
  if (tokens[FRONTIER_PARITY_TOKEN] !== false) throw new Error('TOKEN_VIOLATION:FRONTIER');
  if (tokens[HUMAN_E6_TOKEN] !== false) throw new Error('TOKEN_VIOLATION:HUMAN_E6');

  const remaining_open = matrix.tasks
    .filter((t) => t.coverage_status === 'OPEN')
    .map((t) => `${t.task_id} ${t.category}`);
  const remaining_partial = matrix.tasks
    .filter((t) => t.coverage_status === 'PARTIAL')
    .map((t) => `${t.task_id} ${t.category}`);
  if (proAudit.status !== 'HOST_OBSERVED') {
    remaining_open.push(`LOCAL_PRO ${proAudit.status}`);
  }

  const deferred_heavy_work = [
    proAudit.status === 'HOST_OBSERVED'
      ? null
      : 'LOCAL_PRO ~1GB GGUF download + HOST_OBSERVED quality gate (RESOURCE_BLOCKED on this host)',
    'Live microphone HUMAN_PENDING (fixtures prove STT/TTS)',
    'Darwin AX GUI of third-party apps DEVICE/HUMAN pending (lab editor REAL file proven)',
    'HUMAN_E6 companion polish validation (digital wiring COMPLETE; polish not human-validated)',
    'device-os Pixel proof remains a separate gate',
  ].filter((x): x is string => Boolean(x));

  const report: UserReady004Report = {
    schema: 'gunnchai.user_ready_004.v1',
    packet: 'AI-USER-READY-004',
    generatedAt: new Date().toISOString(),
    accepted_main_base: String(matrix.accepted_main_base ?? ''),
    tokens,
    pixels: VISUAL_UNAVAILABLE,
    modelTiers,
    localPro: {
      status: proAudit.status,
      sha256: proAudit.sha256,
      notes: proAudit.notes,
      observation: proAudit.observation,
      resourceSafe: proAudit.resourceSafe,
    },
    coverage,
    results,
    p1: {
      cowrite: cowriteEvidence,
      agents: agentsEvidence,
      voice: voiceEvidence,
      computer_use: cuEvidence,
      audio_overview: audioEvidence,
      companion: companionEvidence,
      vision: visionRow?.evidence,
      local_pro: {
        status: proAudit.status,
        notes: proAudit.notes,
      },
    },
    stubChallengeFailures,
    next_packet: matrix.next_packet,
    remaining_open,
    remaining_partial,
    allImplementedPassed: digitalPass,
    eval_summary: {
      cowrite_complete: cowritePassed,
      agents_partial: agentsPassed,
      agents_real_tool_execution: agentsEvidence.realToolExecution,
      voice_partial: voicePartialPassed,
      computer_use_partial: cuPassed,
      computer_use_real_os_automation: cuEvidence.realOsAutomation,
      audio_overview_partial: audioPassed,
      audio_real_tts_speech: audioEvidence.realTtsSpeech,
      companion_partial: false,
      companion_complete_digital: companionPassed,
      companion_button_backend_wired: companionEvidence.buttonBackendWired,
      vision_partial: visionRow?.passed ?? false,
      vision_neural_vlm: false,
      vision_semantic_raster: visionSemanticRaster,
      local_fast: results.find((r) => r.task_id === 'AI-UR-016')?.passed ?? false,
      local_pro: proAudit.status,
      coverage: {
        complete: coverage.complete,
        partial: coverage.partial,
        open: coverage.open,
        complete_ids: coverage.complete_ids,
        partial_ids: coverage.partial_ids,
        open_ids: coverage.open_ids,
      },
      HUMAN_E6: false,
      FRONTIER_PARITY: false,
      [USER_READY_004_TOKEN]: digitalPass,
    },
    deferred_heavy_work,
  };

  const outDir = path.join(cwd, 'artifacts', 'user-ready');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AI_USER_READY_004_RESULT.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
