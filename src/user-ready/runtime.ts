/**
 * AI-USER-READY-001 runtime: execute the implemented market-task subset.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ArtifactAssist } from './artifacts';
import { classifyCompanionVsChatbot } from './companion';
import { loadMarketBaseline, loadTaskMatrix } from './matrix';
import { inspectModelTiers } from './model_tiers';
import { ProjectMemoryRuntime } from './projects_memory';
import { CitedResearchRuntime } from './research_citations';
import { socraticTurn } from './socratic';
import { SourceGroundedNotebook } from './source_grounded';
import { assertNotStub, challengeImplementedFlags } from './stub_challenge';
import { ToolAuthSession } from './tool_auth';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_PACKET_TOKEN,
  VISUAL_UNAVAILABLE,
  buildUserReadyTokens,
  type UserReadyTokens,
} from './tokens';

export interface TaskRunResult {
  task_id: string;
  category: string;
  passed: boolean;
  local: boolean;
  cloud_only: false;
  notes: string;
  evidence: Record<string, unknown>;
}

export interface CoverageCounts {
  required: number;
  implemented: number;
  runtime: number;
  offline: number;
  cloud_only: number;
  gap: number;
}

export interface UserReadyReport {
  schema: 'gunnchai.user_ready_001.v1';
  packet: 'AI-USER-READY-001';
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

function coverageFrom(matrix: ReturnType<typeof loadTaskMatrix>, results: TaskRunResult[]): CoverageCounts {
  const required = matrix.tasks.length;
  const implemented = matrix.tasks.filter((t) => t.implemented).length;
  const runtime = results.filter((r) => r.passed).length;
  const offline = matrix.tasks.filter((t) => t.local_required && t.implemented).length;
  const cloud_only = matrix.tasks.filter((t) => !t.local_required && t.cloud_optional && !t.implemented).length;
  const gap = matrix.tasks.filter((t) => !t.implemented).length;
  return { required, implemented, runtime, offline, cloud_only, gap };
}

export async function runUserReadyPacket(
  cwd = process.cwd(),
  opts?: { scratch?: string },
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
      notes: 'Offline cited report; fabricated source rejected. Live web Deep Research OPEN.',
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

  const companion = classifyCompanionVsChatbot('help me tutor OFDM on this handheld');
  assertNotStub('companion.classification', companion);

  const modelTiers = inspectModelTiers(cwd);
  const allImplementedPassed =
    results.every((r) => r.passed) && stubChallengeFailures.length === 0;
  const tokens = buildUserReadyTokens(allImplementedPassed);
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
    schema: 'gunnchai.user_ready_001.v1',
    packet: 'AI-USER-READY-001',
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
  fs.writeFileSync(path.join(outDir, 'AI_USER_READY_001_RESULT.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
