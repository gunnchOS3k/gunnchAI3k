/**
 * AI_WAIKE_MASTERY_EVAL suite — publish scores; mastery PASS only under policy.
 * Infra smoke is separate from WAIKE_AI_DIGITAL_MASTERY_PASS.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runKeyLeakCanary } from './canary';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';
import { diagnose, runRemediationLoop } from './diagnosis';
import { proposeGradeAssist, runEducatorCopilot } from './educator';
import { assertModePermission, createModeSession, MODE_PERMISSIONS } from './modes';
import {
  assertNoFalseMasteryPass,
  buildMasteryTokens,
  INFRA_SMOKE_TOKEN,
  MASTERY_OVERALL_MIN,
  MASTERY_PASS_TOKEN,
} from './tokens';

export interface MasteryEvalReport {
  suite: 'AI_WAIKE_MASTERY_EVAL';
  corpus: {
    discoverable_courses: number;
    course_ids: string[];
    waike_root: string | null;
  };
  children: Record<string, { pass: boolean; detail?: string }>;
  mastery_scores: Record<string, unknown> | null;
  tool_use: Record<string, unknown> | null;
  canary: ReturnType<typeof runKeyLeakCanary>;
  diagnosis_remediation: {
    open_loop_final: string;
    closed_loop_final: string;
  };
  educator_mode: ReturnType<typeof runEducatorCopilot>;
  tokens: ReturnType<typeof buildMasteryTokens>;
  open: string[];
  WAIKE_AI_DIGITAL_MASTERY_PASS: boolean;
  AI_WAIKE_MASTERY_INFRA_SMOKE_PASS: boolean;
}

function loadWaikeEval(waikeRoot: string | null): Record<string, unknown> | null {
  if (!waikeRoot) return null;
  const p = path.join(waikeRoot, 'artifacts', 'mastery', 'AI_WAIKE_MASTERY_EVAL.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
}

function ensureWaikeArtifacts(waikeRoot: string): Record<string, unknown> | null {
  const script = path.join(waikeRoot, 'scripts', 'emit_waike_mastery.py');
  if (!fs.existsSync(script)) return loadWaikeEval(waikeRoot);
  // Always re-emit so gunnchAI tip tracks honest waike scores/tokens
  const r = spawnSync('python3', [script], { cwd: waikeRoot, encoding: 'utf8', timeout: 180_000 });
  if (r.status !== 0 && r.status !== 2) {
    return { emit_failed: true, status: r.status, stderr: r.stderr, stdout: r.stdout };
  }
  return loadWaikeEval(waikeRoot);
}

export async function runMasteryEvalSuite(cwd = process.cwd()): Promise<MasteryEvalReport> {
  const waikeRoot = resolveWaikeRoot(cwd);
  const discovered = waikeRoot
    ? discoverCoursesFromContract(waikeRoot)
    : { course_count: 0, courses: [] as { course_id: string }[], hardcoded_course_names: false as const };

  const waikeEval = waikeRoot ? ensureWaikeArtifacts(waikeRoot) : null;

  let modePass = true;
  let modeDetail = 'ok';
  try {
    assertModePermission('MASTERY_BENCHMARK', 'read_instructor_keys');
    modePass = false;
    modeDetail = 'mastery unexpectedly allowed keys';
  } catch {
    /* expected */
  }
  try {
    assertModePermission('LEARNER_TUTOR', 'read_instructor_keys');
    modePass = false;
    modeDetail = 'tutor unexpectedly allowed keys';
  } catch {
    /* expected */
  }
  const edu = createModeSession('EDUCATOR_COPILOT');
  if (!edu.permissions.mayReadInstructorKeys || !edu.permissions.hitlGradingRequired) {
    modePass = false;
    modeDetail = 'educator permissions wrong';
  }
  if (MODE_PERMISSIONS.MASTERY_BENCHMARK.maySelfGrade) {
    modePass = false;
    modeDetail = 'mastery self-grade enabled';
  }

  const canary = runKeyLeakCanary(cwd);

  const d = diagnose({
    learnerRef: 'opaque-demo-1',
    courseId: discovered.courses[0]?.course_id || 'GENERAL_IT',
    itemId: 'demo-item',
    week: 1,
  });
  const openLoop = runRemediationLoop(d);
  const closedLoop = runRemediationLoop(d, { reassessScore: 0.92, transferOk: true });

  const educator = runEducatorCopilot(discovered.courses[0]?.course_id || 'GENERAL_IT', 'grading_assist');
  const gradeProp = proposeGradeAssist(discovered.courses[0]?.course_id || 'GENERAL_IT', 0.8);

  const masteryScores = (waikeEval?.mastery_scores as Record<string, unknown>) || null;
  const toolUse = (waikeEval?.tool_use as Record<string, unknown>) || null;
  const overallScore =
    typeof masteryScores?.overall === 'number' ? (masteryScores.overall as number) : null;

  const waikeTokens = (waikeEval?.tokens as Record<string, unknown>) || {};
  const waikeMasteryPass = waikeTokens.WAIKE_AI_DIGITAL_MASTERY_PASS === true;
  const waikeInfra =
    waikeTokens.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS === true ||
    waikeEval?.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS === true;
  const usedKeys = waikeTokens.USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE === true;

  const infraChildren: MasteryEvalReport['children'] = {
    MODE_SEPARATION: { pass: modePass, detail: modeDetail },
    LEARNING_CONTRACT_DISCOVERY: {
      pass: discovered.course_count >= 9 && discovered.hardcoded_course_names === false,
      detail: `courses=${discovered.course_count}`,
    },
    KEY_LEAK_CANARY: {
      pass: canary.pass && canary.canaryTextUsed && canary.solverDiscoveryRefused,
      detail: canary.detail,
    },
    DIAGNOSIS_REMEDIATION: {
      pass:
        openLoop.finalEvidenceState !== 'CERTAINLY_FILLED' &&
        closedLoop.finalEvidenceState === 'CERTAINLY_FILLED',
      detail: `${openLoop.finalEvidenceState}->${closedLoop.finalEvidenceState}`,
    },
    EDUCATOR_COPILOT: {
      pass:
        educator.autoPublishGrades === false &&
        educator.publishWithoutHumanBlocked === true &&
        gradeProp.published === false,
      detail: 'HITL grading assist',
    },
    WAIKE_INFRA_SMOKE: {
      pass: Boolean(waikeEval && waikeInfra),
      detail: waikeEval ? `waike_infra=${waikeInfra}` : 'waike artifacts missing',
    },
    WAIKE_MASTERY_HONESTLY_FALSE_OR_EARNED: {
      pass:
        waikeMasteryPass === false ||
        (overallScore != null && overallScore >= MASTERY_OVERALL_MIN),
      detail: `waike_mastery_pass=${waikeMasteryPass} overall=${overallScore}`,
    },
    TOOL_USE_NOT_OVERCLAIMED: {
      pass:
        !toolUse ||
        toolUse.coverage_status === 'PARTIAL' ||
        toolUse.mastery_complete === false,
      detail: `status=${toolUse?.coverage_status}`,
    },
  };

  const infraSmoke = Object.values(infraChildren).every((c) => c.pass);

  // Mastery PASS only if waike policy earned it — never from infra alone / 0.55 bar
  const masteryPass = waikeMasteryPass === true;
  assertNoFalseMasteryPass(overallScore, masteryPass);

  const tokens = buildMasteryTokens({
    masteryPass,
    infraSmoke,
    usedInstructorKeysDuringSolve: usedKeys,
  });

  const report: MasteryEvalReport = {
    suite: 'AI_WAIKE_MASTERY_EVAL',
    corpus: {
      discoverable_courses: discovered.course_count,
      course_ids: discovered.courses.map((c) => c.course_id),
      waike_root: waikeRoot,
    },
    children: infraChildren,
    mastery_scores: masteryScores,
    tool_use: toolUse,
    canary,
    diagnosis_remediation: {
      open_loop_final: openLoop.finalEvidenceState,
      closed_loop_final: closedLoop.finalEvidenceState,
    },
    educator_mode: educator,
    tokens,
    open: [
      'WAIKE_AI_DIGITAL_MASTERY_PASS demoted — scores published without false PASS.',
      'AI_WAIKE_MASTERY_EVAL tracks mastery (false until earned); INFRA_SMOKE is separate.',
      'Tool-use PARTIAL fixtures ≠ COMPLETE. REAL_*/HUMAN_E6/ACCREDITED remain false.',
      'device-os #116 untouched.',
    ],
    WAIKE_AI_DIGITAL_MASTERY_PASS: tokens[MASTERY_PASS_TOKEN],
    AI_WAIKE_MASTERY_INFRA_SMOKE_PASS: tokens[INFRA_SMOKE_TOKEN],
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AI_WAIKE_MASTERY_EVAL.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
