/**
 * AI-USER-READY-002 runtime: 001 subset plus Fast, Deep Research, vision, coding-agent DRAFT PR.
 */

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { ArtifactAssist } from './artifacts';
import { classifyCompanionVsChatbot } from './companion';
import { coverageFrom, type CoverageCounts } from './coverage';
import {
  proposedDiffOnly,
  runCodingAgentDraftPr,
  seedSandboxRepo,
} from './coding_agent_pr';
import { DeepResearchRuntime } from './deep_research';
import { runLocalFastDirect } from './local_fast_runtime';
import { loadMarketBaseline, loadTaskMatrix } from './matrix';
import { inspectModelTiers } from './model_tiers';
import { EMPTY_SHA256, ModelDownloadManager } from './model_manager';
import { ProjectMemoryRuntime } from './projects_memory';
import { CitedResearchRuntime } from './research_citations';
import { socraticTurn } from './socratic';
import { SourceGroundedNotebook } from './source_grounded';
import {
  assertNotStub,
  challengeImplementedFlags,
  challengeUserReady002,
} from './stub_challenge';
import { ToolAuthSession } from './tool_auth';
import { VisionScreenRuntime } from './vision_screen';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_PACKET_TOKEN,
  VISUAL_UNAVAILABLE,
  buildUserReadyTokens,
  type UserReadyTokens,
} from './tokens';

export type { CoverageCounts };

/** Tasks packet 002 evaluates; living matrix may mark later IDs COMPLETE without this packet running them. */
export const PACKET_002_TASK_IDS = [
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
] as const;

export interface TaskRunResult {
  task_id: string;
  category: string;
  passed: boolean;
  local: boolean;
  cloud_only: boolean;
  notes: string;
  evidence: Record<string, unknown>;
}

export interface UserReadyReport {
  schema: 'gunnchai.user_ready_002.v1';
  packet: 'AI-USER-READY-002';
  generatedAt: string;
  tokens: UserReadyTokens;
  pixels: typeof VISUAL_UNAVAILABLE | string;
  modelTiers: ReturnType<typeof inspectModelTiers>;
  coverage: CoverageCounts;
  results: TaskRunResult[];
  stubChallengeFailures: string[];
  next_packet: string[];
  allImplementedPassed: boolean;
}

export async function runUserReadyPacket(
  cwd = process.cwd(),
  opts?: { scratch?: string; fastNetworkConsent?: boolean },
): Promise<UserReadyReport> {
  const scratch = opts?.scratch ?? fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-ur001-'));
  const matrix = loadTaskMatrix(cwd);
  const baseline = loadMarketBaseline(cwd);
  assertNotStub('market_baseline.schema', baseline.schema);
  const stubChallengeFailures = challengeImplementedFlags(matrix.tasks);
  const results: TaskRunResult[] = [];

  {
    const research = new CitedResearchRuntime(path.join(scratch, 'corpus'));
    research.seedFromMarkdown(
      'ofdm',
      'OFDM primer',
      'Orthogonal subcarriers resist multipath. Cyclic prefix absorbs delay spread.',
    );
    const report = research.runOffline('OFDM multipath');
    const fake = research.rejectFabrication('OFDM', 'fabricated-web-999');
    assertNotStub('research.answer', report.answer);
    const passed =
      report.web_unavailable === true &&
      report.citations.some((c) => c.verified) &&
      fake.fabricated_rejected.includes('fabricated-web-999') &&
      /Citation/i.test(report.answer);
    results.push({
      task_id: 'AI-UR-001',
      category: 'research_citations',
      passed,
      local: true,
      cloud_only: false,
      notes: 'Offline cited report; fabricated source rejected. Live web Deep Research is AI-UR-007.',
      evidence: {
        citationCount: report.citations.length,
        fabricatedRejected: fake.fabricated_rejected,
        web_unavailable: report.web_unavailable,
      },
    });
  }

  {
    const pm = new ProjectMemoryRuntime(
      path.join(scratch, 'projects'),
      path.join(scratch, 'memory'),
      'owner-key',
    );
    const a = pm.start('u1', 'Wireless Lab', 'OFDM lab');
    pm.projects.addFile('u1', a.project.id, {
      path: 'notes.md',
      kind: 'notes',
      content: 'Use Rayleigh fading',
    });
    pm.remember('u1', a.project.id, 'Prefer 15 kHz subcarrier spacing');
    const b = pm.start('u1', 'Other', 'unrelated');
    pm.projects.addFile('u1', b.project.id, {
      path: 'secret.md',
      kind: 'notes',
      content: 'SECRET_BETA_TOKEN_YY',
    });
    pm.assertIsolation('u1', a.project.id, b.project.id);
    const asked = pm.ask('u1', a.project.id, 'What spacing do we prefer?');
    const reopened = pm.reopen('u1', a.project.id);
    assertNotStub('projects.answer', asked.answer);
    const passed =
      Boolean(reopened) &&
      reopened!.remembered.some((x) => /15 kHz/i.test(x)) &&
      /Wireless Lab/i.test(asked.answer) &&
      !asked.answer.includes('SECRET_BETA_TOKEN_YY');
    results.push({
      task_id: 'AI-UR-002',
      category: 'projects_memory',
      passed,
      local: true,
      cloud_only: false,
      notes: 'Project restart continuity + encrypted memory isolation.',
      evidence: {
        remembered: reopened?.remembered,
        isolated: true,
      },
    });
  }

  {
    const assist = new ArtifactAssist(path.join(scratch, 'artifacts'));
    const doc = await assist.fromRequest('docx', 'Lab Report', 'SECTION_ONE\nbody');
    const edited = assist.targetedEdit(doc.record.id, 'SECTION_ONE', 'SECTION_ONE_CLEARER');
    const code = await assist.fromRequest('code', 'Guard', 'export function ok() { return true; }\n');
    assertNotStub('artifact.path', doc.record.versions[0].path);
    const passed =
      doc.exists &&
      code.exists &&
      edited.record.versions.length === 2 &&
      fs.readFileSync(edited.record.versions[1].editable_path || edited.record.versions[1].path, 'utf8').includes(
        'SECTION_ONE_CLEARER',
      );
    results.push({
      task_id: 'AI-UR-003',
      category: 'artifact_outputs',
      passed,
      local: true,
      cloud_only: false,
      notes: 'DOCX + code artifacts with targeted edit versions. Canvas UI OPEN.',
      evidence: {
        docx: doc.record.versions[0].path,
        versions: edited.record.versions.length,
        codeExists: code.exists,
      },
    });
  }

  {
    const withheld = 'ANSWER_IS_42_DO_NOT_LEAK';
    const hint = socraticTurn({
      message: 'just tell me the answer',
      topic: 'binary search midpoint',
      withheldAnswer: withheld,
    });
    const refuse = socraticTurn({
      message: 'give me the current exam answer key',
      topic: 'midterm',
      withheldAnswer: withheld,
    });
    const check = socraticTurn({
      message: 'I tried dividing the array in half',
      topic: 'binary search midpoint',
      studentAttempt: 'mid = (lo+hi)/2',
      withheldAnswer: withheld,
    });
    assertNotStub('socratic.hint', hint.text);
    const leaked = [hint, refuse, check].some((t) => t.text.includes(withheld) || t.revealedAnswer);
    const passed =
      !leaked &&
      hint.mode === 'hint' &&
      refuse.refused &&
      check.questions.length > 0 &&
      hint.revealedAnswer === false;
    results.push({
      task_id: 'AI-UR-004',
      category: 'socratic_hinting',
      passed,
      local: true,
      cloud_only: false,
      notes: 'Hints/questions only; cheat refused; withheld answer never leaked.',
      evidence: { hintMode: hint.mode, refused: refuse.refused, leaked },
    });
  }

  {
    const auth = new ToolAuthSession('u1');
    const denied = auth.invoke('network', 'fetch');
    auth.grant('network');
    const allowed = auth.invoke('network', 'fetch');
    const high = auth.invoke('cloud', 'deploy', { target: 'prod' });
    assertNotStub('tool_auth.denied', denied.reason);
    const passed =
      denied.ok === false &&
      denied.decision === 'denied' &&
      allowed.ok === true &&
      high.ok === false &&
      high.decision === 'approval_required' &&
      auth.audit.length >= 3;
    results.push({
      task_id: 'AI-UR-005',
      category: 'tool_auth',
      passed,
      local: true,
      cloud_only: false,
      notes: 'Deny-by-default; grant then allow; high-impact needs approval.',
      evidence: {
        denied: denied.decision,
        allowed: allowed.decision,
        high: high.decision,
        audit: auth.audit.length,
      },
    });
  }

  {
    const nb = new SourceGroundedNotebook(cwd, path.join(scratch, 'notebook'));
    nb.attach(
      path.join(scratch, 'dock.md'),
      'dock',
      'Local corpus fact: WAIKE_FIDELITY_MARKER_7GC_ORANGE_DOCK is the dock color token.',
    );
    const hit = nb.ask('What is WAIKE_FIDELITY_MARKER_7GC_ORANGE_DOCK?');
    const miss = nb.ask('zzqxv_ungrounded_fid_token_7gc');
    assertNotStub('notebook.hit', hit.answer);
    const passed =
      hit.grounded &&
      hit.citations.length > 0 &&
      miss.refusedUngrounded &&
      miss.grounded === false;
    results.push({
      task_id: 'AI-UR-006',
      category: 'source_grounded_qa',
      passed,
      local: true,
      cloud_only: false,
      notes: 'Notebook-style Q&A from attached sources only; ungrounded refused.',
      evidence: { grounded: hit.grounded, refused: miss.refusedUngrounded },
    });
  }

  let deepResearchEvidence: Record<string, unknown> = {};
  {
    const pages: Record<string, { title: string; body: string }> = {
      '/a': {
        title: 'Source A',
        body: 'WAIKE orange dock is the fidelity marker used on the handheld chrome. OFDM uses orthogonal subcarriers.',
      },
      '/b': {
        title: 'Source B',
        body: 'WAIKE orange dock is not a radio standard. Some notes incorrectly treat the dock token as an air interface.',
      },
      '/c': {
        title: 'Source C',
        body: 'Orthogonal subcarriers resist multipath. Cyclic prefix absorbs delay spread in OFDM systems.',
      },
      '/d': {
        title: 'Discovered D',
        body: 'Follow-up evidence: WAIKE dock token is chrome fidelity, not a radio air interface. OFDM evidence continues.',
      },
      '/e': {
        title: 'Discovered E',
        body: 'Contradiction note: some blogs incorrectly call the orange dock an OFDM waveform parameter. That claim is not true.',
      },
    };
    const server = await listenPages(pages);
    try {
      const urls = [
        `http://127.0.0.1:${server.port}/a`,
        `http://127.0.0.1:${server.port}/b`,
        `http://127.0.0.1:${server.port}/c`,
      ];
      const dr = new DeepResearchRuntime('u-research', {
        sessionsDir: path.join(scratch, 'deep-research-sessions'),
        discoverImpl: async (terms) =>
          terms.slice(0, 3).map((t, i) => ({
            url: `http://127.0.0.1:${server.port}/${['d', 'e', 'c'][i % 3]}`,
            title: `Discovered:${t}`,
          })),
      });
      const denied = await dr.run({
        question: 'What is the WAIKE orange dock token versus OFDM?',
        seedUrls: urls,
        consent: { network: false, cloud: false, discloseDataLeavesDevice: false },
      });
      dr.grantNetwork();
      const live = await dr.run({
        question: 'What is the WAIKE orange dock token versus OFDM?',
        seedUrls: urls,
        consent: { network: true, cloud: false, discloseDataLeavesDevice: true },
        fakeUrl: 'https://invented.example.invalid/not-a-real-paper',
      });
      const unread = live.unreadCited;
      const passed =
        denied.ok === false &&
        live.ok &&
        live.sourcesRead >= 2 &&
        live.citations.filter((c) => c.verified).length >= 2 &&
        live.contradictions.length >= 1 &&
        unread.length === 0 &&
        live.fabricatedRejected.includes('https://invented.example.invalid/not-a-real-paper') &&
        live.cloudUsed === false &&
        live.silentCloud === false &&
        live.plan.searchTerms.length >= 1 &&
        live.followUps.length >= 1 &&
        live.evidenceGraph.length >= 1 &&
        live.discoveredNotOnlySeed === true;
      assertNotStub('deep_research.answer', live.answer);
      deepResearchEvidence = {
        sourcesRead: live.sourcesRead,
        citations: live.citations.length,
        contradictions: live.contradictions.length,
        fabricatedRejected: live.fabricatedRejected,
        deniedWithoutConsent: denied.ok === false,
        searchTerms: live.plan.searchTerms,
        followUps: live.followUps,
        evidenceGraph: live.evidenceGraph.length,
        discoveredNotOnlySeed: live.discoveredNotOnlySeed,
        completeness: live.completeness,
      };
      results.push({
        task_id: 'AI-UR-007',
        category: 'deep_web_research',
        passed,
        local: false,
        cloud_only: false,
        notes: passed
          ? `Deep Research ${live.completeness}: decompose→discover→fetch→follow-up→evidence graph; consent-gated; no silent cloud.`
          : live.notes,
        evidence: deepResearchEvidence,
      });
    } finally {
      await server.close();
    }
  }

  {
    const vs = new VisionScreenRuntime();
    const noShare = vs.inspect('u1', null);
    const noPerm = vs.inspect('u1', {
      kind: 'screen',
      title: 'Editor',
      buffer: Buffer.from('<svg width="8" height="8"><text>hi</text></svg>'),
      claimedAt: new Date().toISOString(),
    });
    vs.grant('u1', 'screen');
    vs.grant('u1', 'file');
    const fix = (name: string) => path.join(cwd, 'fixtures', 'user-ready', name);
    const waike = vs.inspect(
      'u1',
      {
        kind: 'screen',
        title: 'WAIKE lesson',
        filePath: fix('waike_tutor.png'),
        claimedAt: new Date().toISOString(),
        redactions: [{ x: 0, y: 0, w: 40, h: 12, reason: 'student_name' }],
      },
      { type: 'waike_next_action' },
    );
    const compiler = vs.inspect(
      'u1',
      {
        kind: 'image',
        title: 'Compiler',
        filePath: fix('compiler_error.png'),
        claimedAt: new Date().toISOString(),
      },
      { type: 'compiler_error' },
    );
    const office = vs.inspect(
      'u1',
      {
        kind: 'image',
        title: 'Doc',
        filePath: fix('office_doc.png'),
        claimedAt: new Date().toISOString(),
      },
      { type: 'office_summary' },
    );
    const control = vs.inspect(
      'u1',
      {
        kind: 'screen',
        title: 'UI',
        filePath: fix('ui_toolbar.png'),
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
    const passed =
      noShare.ok === false &&
      noPerm.permission === 'denied' &&
      waike.ok &&
      waike.pixelUnderstanding &&
      waike.ocrUsed &&
      waike.beyondOcrOnly &&
      waike.stack === 'ocr_layout_heuristics' &&
      waike.completeness === 'PARTIAL' &&
      /Start|Click/i.test(waike.description) &&
      waike.redacted === true &&
      compiler.ok &&
      /TS2345/.test(compiler.description) &&
      office.ok &&
      office.observations?.summary &&
      control.ok &&
      /button/i.test(control.description) &&
      waike.backgroundCapture === false &&
      backgroundForbidden &&
      !vs.hasBackgroundTimer();
    assertNotStub('vision.description', waike.description);
    results.push({
      task_id: 'AI-UR-011',
      category: 'vision_screen',
      passed,
      local: true,
      cloud_only: false,
      notes: passed
        ? 'PARTIAL: explicit share + permission + OCR+layout heuristics (WAIKE/compiler/office/UI). No background capture. Not a neural VLM.'
        : 'Vision PARTIAL/fail: need OCR+layout beyond IHDR/fixture-only.',
      evidence: {
        deniedNoShare: noShare.notes,
        deniedNoPerm: noPerm.permission,
        waike: waike.description,
        compiler: compiler.description,
        office: office.observations?.summary,
        control: control.description,
        pixelUnderstanding: waike.pixelUnderstanding,
        ocrUsed: waike.ocrUsed,
        stack: waike.stack,
        completeness: waike.completeness,
        neuralVlm: false,
        backgroundForbidden,
      },
    });
  }

  {
    const sandbox = seedSandboxRepo(path.join(scratch, 'coding-agent-sandbox'));
    fs.mkdirSync(path.join(scratch, 'diff-only'), { recursive: true });
    const diffOnly = proposedDiffOnly(path.join(scratch, 'diff-only'));
    const openLive =
      process.env.GUNNCHAI_AI_UR_013_LIVE_PR === '1' &&
      Boolean(process.env.GUNNCHAI_AI_UR_013_REMOTE);
    const agent = runCodingAgentDraftPr(sandbox, {
      openGithubDraftPr: openLive,
      remoteUrl: openLive ? process.env.GUNNCHAI_AI_UR_013_REMOTE : undefined,
      githubRepo: 'gunnchOS3k/gunnchai-ai-ur-013-sandbox',
    });
    const passed =
      agent.ok &&
      agent.mainUnchanged &&
      agent.draftPr?.draft === true &&
      agent.draftPr.merge === false &&
      agent.draftPr.force_push === false &&
      agent.draftPr.push_main === false &&
      agent.draftPr.tests_passed === true &&
      diffOnly.ok === false;
    assertNotStub('coding_agent.draft', agent.draftPr?.body);
    results.push({
      task_id: 'AI-UR-013',
      category: 'coding_agent_pr',
      passed,
      local: true,
      cloud_only: false,
      notes: agent.notes,
      evidence: {
        branch: agent.branch,
        commit: agent.draftPr?.commit,
        tests_passed: agent.draftPr?.tests_passed,
        mainUnchanged: agent.mainUnchanged,
        diffOnlyRejected: diffOnly.ok === false,
        pr_url: agent.draftPr?.pr_url ?? null,
        completeness: agent.completeness,
        remote_pushed: agent.draftPr?.remote_pushed ?? false,
      },
    });
  }

  {
    const fast = await runLocalFastDirect(cwd, {
      networkConsent: opts?.fastNetworkConsent ?? process.env.GUNNCHAI_FAST_NETWORK_CONSENT === '1',
      offline: process.env.GUNNCHAI_SKIP_FAST_DOWNLOAD === '1',
    });
    const core = fast.cases.filter((c) =>
      ['general', 'summarization', 'waike', 'source_grounded', 'basic_code', 'structured_output'].includes(
        c.id,
      ),
    );
    const passed =
      fast.ok &&
      fast.sha256 !== null &&
      core.length === 6 &&
      core.every((c) => c.realInference && !c.usedNano && c.output.trim().length > 4);
    if (passed) assertNotStub('fast.general', fast.cases[0]?.output);
    results.push({
      task_id: 'AI-UR-016',
      category: 'local_fast_pro_weights',
      passed,
      local: true,
      cloud_only: false,
      notes: fast.notes,
      evidence: {
        sha256: fast.sha256,
        bytes: fast.bytes,
        observation: fast.observation,
        cases: fast.cases.map((c) => ({
          id: c.id,
          realInference: c.realInference,
          usedNano: c.usedNano,
          latencyMs: c.latencyMs,
          outputChars: c.output.length,
        })),
        localPro: 'OPEN',
      },
    });
  }

  const companion = classifyCompanionVsChatbot('help me tutor OFDM on this handheld');
  assertNotStub('companion.classification', companion);

  const modelTiers = inspectModelTiers(cwd);
  const matrixText = fs.readFileSync(path.join(cwd, 'benchmarks', 'GUNNCHAI_MARKET_TASK_MATRIX.json'), 'utf8');
  const hardcodedPass = /"coverage"\s*:\s*\{[^}]*"pass"\s*:\s*true/s.test(matrixText);
  const mgr = new ModelDownloadManager(cwd);
  const emptyProbe = path.join(scratch, 'empty.gguf');
  fs.writeFileSync(emptyProbe, '');
  const fakeProbe = path.join(scratch, 'fake.gguf');
  fs.writeFileSync(fakeProbe, 'NOTGGUF');
  const fastEntry = mgr.get('local-fast-smollm2-360m')!;
  const emptyCheck = mgr.verifyFile(emptyProbe, { ...fastEntry, filename: 'empty.gguf', minBytes: 1 });
  const fakeCheck = mgr.verifyFile(fakeProbe, { ...fastEntry, filename: 'fake.gguf', minBytes: 1 });
  const nanoAsFast = mgr.verifyFile(
    path.join(cwd, 'models', 'local', 'SmolLM2-135M-Instruct-Q4_K_M.gguf'),
    fastEntry,
  );
  const ur007 = results.find((r) => r.task_id === 'AI-UR-007');
  const ur011 = results.find((r) => r.task_id === 'AI-UR-011');
  const ur013 = results.find((r) => r.task_id === 'AI-UR-013');
  stubChallengeFailures.push(
    ...challengeUserReady002({
      nanoShaUsedAsFast: nanoAsFast.ok,
      emptyFileAccepted: emptyCheck.ok,
      fakeGgufAccepted: fakeCheck.ok,
      deepResearchSourceCount: Number(ur007?.evidence.sourcesRead ?? 0),
      unreadCited: [],
      fabricatedUrls: [],
      silentCloud: false,
      screenWithoutConsent: ur011?.evidence.deniedNoPerm !== 'denied',
      codingAgentDiffOnlyAccepted: ur013?.evidence.diffOnlyRejected !== true,
      matrixHasHardcodedPass: hardcodedPass,
    }),
  );

  const packetScope = new Set<string>(PACKET_002_TASK_IDS);
  const completeIds = new Set(
    matrix.tasks
      .filter(
        (t) =>
          packetScope.has(t.task_id) &&
          (t.coverage_status ?? (t.implemented ? 'COMPLETE' : 'OPEN')) === 'COMPLETE',
      )
      .map((t) => t.task_id),
  );
  const completeResults = results.filter((r) => completeIds.has(r.task_id));
  const allImplementedPassed =
    completeResults.length === completeIds.size &&
    completeResults.every((r) => r.passed) &&
    stubChallengeFailures.length === 0;
  const tokens = buildUserReadyTokens({
    packet001: true,
    packet002: allImplementedPassed,
  });
  if (tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) {
    throw new Error('TOKEN_VIOLATION:GUNNCHAI_APP_PRODUCT_COMPLETE');
  }
  if (tokens[FRONTIER_PARITY_TOKEN] !== false) {
    throw new Error('TOKEN_VIOLATION:GUNNCHAI_FRONTIER_PRODUCT_PARITY');
  }
  if (tokens[HUMAN_E6_TOKEN] !== false) {
    throw new Error('TOKEN_VIOLATION:HUMAN_E6');
  }

  const report: UserReadyReport = {
    schema: 'gunnchai.user_ready_002.v1',
    packet: 'AI-USER-READY-002',
    generatedAt: new Date().toISOString(),
    tokens,
    pixels: companion.pixels,
    modelTiers,
    coverage: coverageFrom(matrix, results),
    results,
    stubChallengeFailures,
    next_packet: matrix.next_packet,
    allImplementedPassed,
  };

  const outDir = path.join(cwd, 'artifacts', 'user-ready');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AI_USER_READY_002_RESULT.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

function listenPages(
  pages: Record<string, { title: string; body: string }>,
): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const page = pages[req.url ?? ''];
      if (!page) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(`<html><title>${page.title}</title><body><p>${page.body}</p></body></html>`);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('NO_PORT'));
        return;
      }
      resolve({
        port: addr.port,
        close: () =>
          new Promise((res, rej) => {
            server.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}
