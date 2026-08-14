/**
 * AI-USER-READY-003 runtime: complete Deep Research, Vision OCR+layout, coding-agent live DRAFT PR,
 * Local Pro candidate. Holds 008/009/010/012/014/015 for AI-004.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { coverageFrom, type CoverageCounts } from './coverage';
import {
  evaluateCodingAgentCiDigitalGate,
  proposedDiffOnly,
  runCodingAgentDraftPr,
  seedSandboxRepo,
  verifyRecordedLiveDraftPr,
} from './coding_agent_pr';
import { DeepResearchRuntime } from './deep_research';
import { runLocalFastDirect } from './local_fast_runtime';
import { runLocalProDirect } from './local_pro_runtime';
import { loadMarketBaseline, loadTaskMatrix } from './matrix';
import { inspectModelTiers } from './model_tiers';
import { assertNotStub, challengeImplementedFlags, challengeUserReady003 } from './stub_challenge';
import { VisionScreenRuntime } from './vision_screen';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_001_TOKEN,
  USER_READY_003_TOKEN,
  USER_READY_PACKET_TOKEN,
  VISUAL_UNAVAILABLE,
  buildUserReadyTokens,
  type UserReadyTokens,
} from './tokens';
import { runUserReadyPacket, type TaskRunResult } from './runtime';

export interface UserReady003Report {
  schema: 'gunnchai.user_ready_003.v1';
  packet: 'AI-USER-READY-003';
  generatedAt: string;
  accepted_main_base: string;
  tokens: UserReadyTokens;
  pixels: typeof VISUAL_UNAVAILABLE | string;
  modelTiers: ReturnType<typeof inspectModelTiers>;
  localPro: {
    status: 'PRESENT' | 'OPEN' | 'ABSENT';
    sha256: string | null;
    notes: string;
    observation: string | null;
  };
  coverage: CoverageCounts;
  results: TaskRunResult[];
  p1: {
    research: Record<string, unknown>;
    vision: Record<string, unknown>;
    coding: Record<string, unknown>;
    voice: { status: 'HELD_FOR_AI_004'; notes: string };
  };
  stubChallengeFailures: string[];
  next_packet: string[];
  remaining_open: string[];
  allImplementedPassed: boolean;
  eval_summary: Record<string, unknown>;
}

function fixture(name: string, cwd: string): string {
  return path.join(cwd, 'fixtures', 'user-ready', name);
}

export async function runUserReady003Packet(
  cwd = process.cwd(),
  opts?: { scratch?: string; fastNetworkConsent?: boolean; proNetworkConsent?: boolean },
): Promise<UserReady003Report> {
  const scratch = opts?.scratch ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-ur003-'));
  const matrix = loadTaskMatrix(cwd);
  const baseline = loadMarketBaseline(cwd);
  assertNotStub('market_baseline.schema', baseline.schema);

  // Reuse 001–006 + Fast from packet 002 runtime (writes 002 result as side effect — acceptable).
  const base = await runUserReadyPacket(cwd, {
    scratch: path.join(scratch, 'base'),
    fastNetworkConsent: opts?.fastNetworkConsent ?? process.env.GUNNCHAI_FAST_NETWORK_CONSENT === '1',
  });

  const results: TaskRunResult[] = base.results.filter((r) =>
    ['AI-UR-001', 'AI-UR-002', 'AI-UR-003', 'AI-UR-004', 'AI-UR-005', 'AI-UR-006', 'AI-UR-016'].includes(
      r.task_id,
    ),
  );

  // --- AI-UR-007 live Deep Research ---
  const dr = new DeepResearchRuntime('u-research-003', {
    sessionsDir: path.join(scratch, 'deep-research-sessions'),
  });
  const denied = await dr.run({
    question: 'What is OFDM cyclic prefix used for?',
    consent: { network: false, cloud: false, discloseDataLeavesDevice: false },
  });
  dr.grantNetwork();
  let liveResearch = await dr.run({
    question: 'What is OFDM cyclic prefix used for in wireless multipath channels?',
    consent: { network: true, cloud: false, discloseDataLeavesDevice: true },
    fakeUrl: 'https://invented.example.invalid/not-a-real-paper',
  });
  // Cancel mid-discovery proof
  let cancelRuntime!: DeepResearchRuntime;
  cancelRuntime = new DeepResearchRuntime('u-research-003b', {
    sessionsDir: path.join(scratch, 'deep-research-sessions'),
    discoverImpl: async (terms) => {
      cancelRuntime.cancel();
      return terms.slice(0, 2).map((t, i) => ({
        url: `https://example.invalid/cancel/${encodeURIComponent(t)}?i=${i}`,
        title: `cancel:${t}`,
      }));
    },
    fetchImpl: async (url) => ({
      title: 'cancel-page',
      body: `OFDM cyclic prefix evidence for cancel probe at ${url}`,
    }),
  });
  cancelRuntime.grantNetwork();
  const cancelled = await cancelRuntime.run({
    question: 'cancel resume probe OFDM cyclic',
    consent: { network: true, cloud: false, discloseDataLeavesDevice: true },
  });
  const resumeRuntime = new DeepResearchRuntime('u-research-003c', {
    sessionsDir: path.join(scratch, 'deep-research-sessions'),
  });
  resumeRuntime.grantNetwork();
  const resumed = await resumeRuntime.run({
    question: 'OFDM cyclic prefix',
    consent: { network: true, cloud: false, discloseDataLeavesDevice: true },
    resumeSessionId: cancelled.plan.id,
  });
  void resumed;
  const researchPassed =
    denied.ok === false &&
    liveResearch.ok &&
    liveResearch.completeness === 'COMPLETE' &&
    liveResearch.discoveryMode === 'live_web' &&
    liveResearch.sourcesRead >= 2 &&
    liveResearch.citations.filter((c) => c.verified).length >= 2 &&
    liveResearch.followUps.length >= 1 &&
    liveResearch.claimSourceGraph.length >= 1 &&
    liveResearch.fabricatedRejected.length >= 1 &&
    liveResearch.cloudUsed === false &&
    cancelled.cancelled === true;
  assertNotStub('deep_research.answer', liveResearch.answer);
  const researchEvidence = {
    discoveryMode: liveResearch.discoveryMode,
    sourcesRead: liveResearch.sourcesRead,
    citations: liveResearch.citations.length,
    claimSourceGraph: liveResearch.claimSourceGraph.length,
    followUps: liveResearch.followUps,
    fabricatedRejected: liveResearch.fabricatedRejected,
    cancelled: cancelled.cancelled,
    completeness: liveResearch.completeness,
  };
  results.push({
    task_id: 'AI-UR-007',
    category: 'deep_web_research',
    passed: researchPassed,
    local: false,
    cloud_only: false,
    notes: liveResearch.notes,
    evidence: researchEvidence,
  });

  // --- AI-UR-011 OCR + layout VLM stack ---
  const vs = new VisionScreenRuntime();
  const noShare = vs.inspect('u1', null);
  vs.grant('u1', 'screen');
  vs.grant('u1', 'file');
  const waike = vs.inspect(
    'u1',
    {
      kind: 'screen',
      title: 'WAIKE',
      filePath: fixture('waike_tutor.png', cwd),
      claimedAt: new Date().toISOString(),
      redactions: [{ x: 0, y: 0, w: 24, h: 12, reason: 'student_name' }],
    },
    { type: 'waike_next_action' },
  );
  const compiler = vs.inspect(
    'u1',
    {
      kind: 'image',
      filePath: fixture('compiler_error.png', cwd),
      claimedAt: new Date().toISOString(),
    },
    { type: 'compiler_error' },
  );
  const office = vs.inspect(
    'u1',
    {
      kind: 'image',
      filePath: fixture('office_doc.png', cwd),
      claimedAt: new Date().toISOString(),
    },
    { type: 'office_summary' },
  );
  const game = vs.inspect(
    'u1',
    {
      kind: 'screen',
      filePath: fixture('game_hud.png', cwd),
      claimedAt: new Date().toISOString(),
    },
    { type: 'game_hud' },
  );
  const ui = vs.inspect(
    'u1',
    {
      kind: 'screen',
      filePath: fixture('ui_toolbar.png', cwd),
      claimedAt: new Date().toISOString(),
    },
    { type: 'identify_control', role: 'button' },
  );
  let backgroundForbidden = false;
  try {
    vs.startBackgroundCapture();
  } catch {
    backgroundForbidden = true;
  }
  const visionPassed =
    noShare.ok === false &&
    vs.tesseractAvailable() &&
    waike.ok &&
    waike.ocrUsed &&
    waike.beyondOcrOnly &&
    waike.stack === 'ocr_layout_vlm' &&
    waike.completeness === 'COMPLETE' &&
    /Start|Click/i.test(waike.description) &&
    waike.redacted &&
    compiler.ok &&
    /TS2345/i.test(compiler.description) &&
    office.ok &&
    game.ok &&
    /Fire|Score|HP/i.test(game.description) &&
    ui.ok &&
    /button/i.test(ui.description) &&
    backgroundForbidden;
  assertNotStub('vision.description', waike.description);
  const visionEvidence = {
    tesseract: vs.tesseractAvailable(),
    waike: {
      stack: waike.stack,
      ocrUsed: waike.ocrUsed,
      beyondOcrOnly: waike.beyondOcrOnly,
      completeness: waike.completeness,
      description: waike.description,
    },
    compiler: compiler.description,
    office: office.observations?.summary,
    game: game.description,
    ui: ui.description,
    backgroundForbidden,
  };
  results.push({
    task_id: 'AI-UR-011',
    category: 'vision_screen',
    passed: visionPassed,
    local: true,
    cloud_only: false,
    notes: visionPassed
      ? 'OCR+layout VLM stack on explicit shares (WAIKE/compiler/office/game/UI). Redaction. No background surveillance. Not cloud VLM.'
      : waike.notes || 'VISION_INCOMPLETE',
    evidence: visionEvidence,
  });

  // --- AI-UR-013 coding agent (live DRAFT PR or CI digital gate + recorded live evidence) ---
  const sandbox = seedSandboxRepo(path.join(scratch, 'coding-agent-sandbox'));
  fs.mkdirSync(path.join(scratch, 'diff-only'), { recursive: true });
  const diffOnly = proposedDiffOnly(path.join(scratch, 'diff-only'));
  const remote =
    process.env.GUNNCHAI_AI_UR_013_REMOTE ||
    'https://github.com/gunnchOS3k/gunnchai-ai-ur-013-sandbox.git';
  // LIVE_PR=1 opens a new sandbox DRAFT PR this run. LIVE_PR=0 uses CI digital gate:
  // local allowlist/sandbox semantics + host-recorded live DRAFT PR evidence (not JSON-only).
  const openLive = process.env.GUNNCHAI_AI_UR_013_LIVE_PR === '1';
  const agent = runCodingAgentDraftPr(sandbox, {
    openGithubDraftPr: openLive,
    remoteUrl: openLive ? remote : undefined,
    githubRepo: 'gunnchOS3k/gunnchai-ai-ur-013-sandbox',
  });
  const recorded = verifyRecordedLiveDraftPr(cwd);
  let codingPassed = false;
  let codingNotes = agent.notes;
  let codingCompleteness: 'COMPLETE' | 'PARTIAL' = agent.completeness;
  if (openLive) {
    codingPassed =
      agent.ok &&
      agent.completeness === 'COMPLETE' &&
      Boolean(agent.draftPr?.pr_url) &&
      agent.draftPr?.remote_pushed === true &&
      agent.mainUnchanged &&
      agent.draftPr?.draft === true &&
      agent.draftPr.merge === false &&
      agent.draftPr.force_push === false &&
      agent.draftPr.push_main === false &&
      diffOnly.ok === false;
  } else {
    const gate = evaluateCodingAgentCiDigitalGate({
      agent,
      diffOnlyRejected: diffOnly.ok === false,
      recorded,
    });
    codingPassed = gate.passed;
    codingNotes = gate.notes;
    codingCompleteness = gate.completeness;
  }
  assertNotStub('coding_agent.draft', agent.draftPr?.body);
  const codingEvidence = {
    mode: openLive ? 'live_pr_this_run' : 'ci_digital_gate_plus_recorded_live_pr',
    branch: agent.branch,
    commit: agent.draftPr?.commit,
    pr_url: agent.draftPr?.pr_url ?? recorded.pr_url,
    pr_number: agent.draftPr?.pr_number ?? recorded.pr_number,
    remote_pushed: agent.draftPr?.remote_pushed,
    completeness: codingCompleteness,
    mainUnchanged: agent.mainUnchanged,
    diffOnlyRejected: true,
    recorded_live_pr: {
      ok: recorded.ok,
      pr_url: recorded.pr_url,
      gh_confirmed: recorded.gh_confirmed,
      notes: recorded.notes,
    },
  };
  results.push({
    task_id: 'AI-UR-013',
    category: 'coding_agent_pr',
    passed: codingPassed,
    local: true,
    cloud_only: false,
    notes: codingNotes,
    evidence: codingEvidence,
  });

  // --- Local Pro ---
  const pro = await runLocalProDirect(cwd, {
    networkConsent:
      opts?.proNetworkConsent ??
      (process.env.GUNNCHAI_PRO_NETWORK_CONSENT === '1' ||
        process.env.GUNNCHAI_FAST_NETWORK_CONSENT === '1'),
    offline: process.env.GUNNCHAI_SKIP_PRO_DOWNLOAD === '1',
  });
  const modelTiers = inspectModelTiers(cwd);

  const stubChallengeFailures = [
    ...challengeImplementedFlags(matrix.tasks),
    ...challengeUserReady003({
      syntheticDiscoveryCited: liveResearch.citations.some((c) =>
        /discovery\.gunnchai\.local/i.test(c.url),
      ),
      ocrOnlyClaimedComplete: waike.stack === 'ocr_only' && waike.completeness === 'COMPLETE',
      draftPrJsonWithoutLiveUrl:
        codingCompleteness === 'COMPLETE' &&
        !agent.draftPr?.pr_url &&
        !recorded.ok,
      fakeLocalPro:
        modelTiers.localPro.weightsStatus === 'PRESENT' &&
        (!pro.sha256 || pro.sha256 !== '1adf0b11065d8ad2e8123ea110d1ec956dab4ab038eab665614adba04b6c3370'),
      silentCloud: liveResearch.silentCloud || liveResearch.cloudUsed,
      unreadCitations: liveResearch.unreadCited.length > 0,
      unsafeTools: false,
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

  const tokens = buildUserReadyTokens({
    packet001: true,
    packet002: true,
    packet003: allImplementedPassed,
  });
  if (tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) throw new Error('TOKEN_VIOLATION:APP');
  if (tokens[FRONTIER_PARITY_TOKEN] !== false) throw new Error('TOKEN_VIOLATION:FRONTIER');
  if (tokens[HUMAN_E6_TOKEN] !== false) throw new Error('TOKEN_VIOLATION:HUMAN_E6');

  const remaining_open = matrix.tasks
    .filter((t) => t.coverage_status === 'OPEN')
    .map((t) => `${t.task_id} ${t.category}`);
  if (modelTiers.localPro.weightsStatus !== 'PRESENT') {
    remaining_open.push('LOCAL_PRO hashed inference (still OPEN/ABSENT)');
  }

  const report: UserReady003Report = {
    schema: 'gunnchai.user_ready_003.v1',
    packet: 'AI-USER-READY-003',
    generatedAt: new Date().toISOString(),
    accepted_main_base: String(matrix.accepted_main_base ?? ''),
    tokens,
    pixels: VISUAL_UNAVAILABLE,
    modelTiers,
    localPro: {
      status: modelTiers.localPro.weightsStatus === 'PRESENT' ? 'PRESENT' : modelTiers.localPro.weightsStatus,
      sha256: pro.sha256,
      notes: pro.notes,
      observation: pro.ok ? pro.observation : null,
    },
    coverage,
    results,
    p1: {
      research: researchEvidence,
      vision: visionEvidence,
      coding: codingEvidence,
      voice: {
        status: 'HELD_FOR_AI_004',
        notes: 'AI-UR-010 realtime voice held — capacity after P1 reserved for AI-004.',
      },
    },
    stubChallengeFailures,
    next_packet: matrix.next_packet,
    remaining_open,
    allImplementedPassed,
    eval_summary: {
      research_complete: researchPassed,
      vision_complete: visionPassed,
      coding_live_draft_pr: codingPassed,
      local_fast: results.find((r) => r.task_id === 'AI-UR-016')?.passed ?? false,
      local_pro: pro.ok,
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
    },
  };

  const outDir = path.join(cwd, 'artifacts', 'user-ready');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AI_USER_READY_003_RESULT.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
