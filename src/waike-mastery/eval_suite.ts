/**
 * AI_WAIKE_MASTERY_EVAL suite — Mastery-002 real solver + corpus discovery.
 * Infra smoke is separate from WAIKE_AI_DIGITAL_MASTERY_PASS.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runKeyLeakCanary } from './canary';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';
import { runCourseHonesty } from './course_honesty';
import { diagnose, runRemediationLoop } from './diagnosis';
import { proposeGradeAssist, runEducatorCopilot } from './educator';
import { assertModePermission, createModeSession, MODE_PERMISSIONS } from './modes';
import { runGunnchaiRuntimeSolver } from './solver';
import { assertNoDemeaningLabels, createStudentModel, safeFeedback } from './student_model';
import {
  assertNoFalseMasteryPass,
  buildMasteryTokens,
  INFRA_SMOKE_TOKEN,
  MASTERY_OVERALL_MIN,
  MASTERY_PASS_TOKEN,
} from './tokens';

function safeFeedbackLine(student: ReturnType<typeof createStudentModel>): string {
  return safeFeedback(student.focusSkills[0] || 'skill:demo', 'opaque learner model inspectable');
}

export interface MasteryEvalReport {
  suite: 'AI_WAIKE_MASTERY_EVAL';
  wave: 'AI-WAIKE-MASTERY-002';
  corpus: {
    discoverable_courses: number;
    course_ids: string[];
    waike_root: string | null;
    hardcoded_course_names: false;
  };
  children: Record<string, { pass: boolean; detail?: string }>;
  mastery_children: Record<string, { pass: boolean; detail?: string }>;
  mastery_scores: Record<string, unknown> | null;
  runtime_solver: Record<string, unknown> | null;
  tool_use: Record<string, unknown> | null;
  canary: ReturnType<typeof runKeyLeakCanary>;
  course_honesty: ReturnType<typeof runCourseHonesty>;
  diagnosis_remediation: {
    open_loop_final: string;
    closed_loop_final: string;
  };
  educator_mode: ReturnType<typeof runEducatorCopilot>;
  tokens: ReturnType<typeof buildMasteryTokens>;
  open: string[];
  WAIKE_AI_DIGITAL_MASTERY_PASS: boolean;
  AI_WAIKE_MASTERY_INFRA_SMOKE_PASS: boolean;
  WAIKE_AI_STUDENT_CORPUS_DISCOVERY_PASS: boolean;
  WAIKE_AI_NO_KEY_LEAK_PASS: boolean;
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
  const honesty = runCourseHonesty(waikeRoot);

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

  // Privacy-safe learner model smoke
  const student = createStudentModel('opaque-demo-1', ['skill:demo']);
  assertNoDemeaningLabels(safeFeedbackLine(student));

  const runtime = await runGunnchaiRuntimeSolver({ cwd, perCourse: 2 });

  const expectedNew = ['WIRELESS_6G', 'ROBOTICS_CONTROL', 'GAME_DEV_INTERACTIVE'];
  const ids = new Set(discovered.courses.map((c) => c.course_id));
  const corpusDiscoveryPass =
    discovered.hardcoded_course_names === false &&
    discovered.course_count >= 12 &&
    expectedNew.every((id) => ids.has(id));

  const waikeTokens = (waikeEval?.tokens as Record<string, unknown>) || {};
  const toolUse = (waikeEval?.tool_use as Record<string, unknown>) || null;

  const runtimeStatus = String(runtime.status || '');
  const runtimeOverall =
    typeof runtime.overall_score === 'number' ? (runtime.overall_score as number) : null;
  const overlapOverall =
    typeof (waikeEval?.mastery_scores as Record<string, unknown> | undefined)?.overall === 'number'
      ? ((waikeEval?.mastery_scores as Record<string, unknown>).overall as number)
      : null;

  // Prefer runtime score when solver ran; else publish overlap with explicit solver tag
  const primaryOverall =
    runtimeStatus === 'OK' && runtimeOverall != null ? runtimeOverall : overlapOverall;

  const masteryScores = {
    overall: primaryOverall,
    runtime_overall: runtimeOverall,
    curriculum_overlap_overall: overlapOverall,
    historical_baseline_001: 0.6442307692307693,
    per_course:
      runtimeStatus === 'OK'
        ? runtime.per_course
        : (waikeEval?.mastery_scores as Record<string, unknown> | undefined)?.per_course,
    solver:
      runtimeStatus === 'OK'
        ? runtime.solver
        : (waikeEval?.mastery_scores as Record<string, unknown> | undefined)?.solver ||
          'curriculum_overlap_v1',
    runtime_status: runtimeStatus,
    published_without_false_pass: true,
  };

  const waikeMasteryPass = waikeTokens.WAIKE_AI_DIGITAL_MASTERY_PASS === true;
  const waikeInfra =
    waikeTokens.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS === true ||
    waikeEval?.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS === true;
  const usedKeys =
    waikeTokens.USED_INSTRUCTOR_KEYS_IN_BENCHMARK_SOLVE === true ||
    runtime.used_instructor_keys_during_solve === true;

  const infraChildren: MasteryEvalReport['children'] = {
    MODE_SEPARATION: { pass: modePass, detail: modeDetail },
    LEARNING_CONTRACT_DISCOVERY: {
      pass: discovered.course_count >= 1 && discovered.hardcoded_course_names === false,
      detail: `courses=${discovered.course_count}`,
    },
    CORPUS_DISCOVERY_CURRENT: {
      pass: corpusDiscoveryPass,
      detail: `courses=${discovered.course_count} new3=${expectedNew.every((id) => ids.has(id))}`,
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
    COURSE_HONESTY: {
      pass: honesty.pass,
      detail: honesty.checks.map((c) => `${c.course_id}:${c.pass}`).join(','),
    },
    RUNTIME_SOLVER_HONEST: {
      pass:
        runtime.answer_key_matched !== true &&
        (runtimeStatus === 'OK' ||
          runtimeStatus === 'BLOCKED_RUNTIME_MODEL' ||
          runtimeStatus === 'BLOCKED_RESOURCE' ||
          runtimeStatus === 'PARTIAL'),
      detail: `status=${runtimeStatus} answer_key_matched=${runtime.answer_key_matched}`,
    },
    WAIKE_INFRA_SMOKE: {
      pass: Boolean(waikeEval && waikeInfra),
      detail: waikeEval ? `waike_infra=${waikeInfra}` : 'waike artifacts missing',
    },
    WAIKE_MASTERY_HONESTLY_FALSE_OR_EARNED: {
      pass:
        waikeMasteryPass === false ||
        (primaryOverall != null && primaryOverall >= MASTERY_OVERALL_MIN),
      detail: `waike_mastery_pass=${waikeMasteryPass} overall=${primaryOverall}`,
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

  const masteryChildren: MasteryEvalReport['mastery_children'] = {
    OVERALL_GE_095: {
      pass: primaryOverall != null && primaryOverall >= 0.95,
      detail: String(primaryOverall),
    },
    CORPUS_DISCOVERY: { pass: corpusDiscoveryPass, detail: `courses=${discovered.course_count}` },
    NO_KEY_LEAK: { pass: canary.pass, detail: canary.detail },
    COURSE_HONESTY: { pass: honesty.pass },
    TOOL_USE_COMPLETE: { pass: toolUse?.mastery_complete === true, detail: String(toolUse?.coverage_status) },
    RUNTIME_NOT_KEY_MATCH: { pass: runtime.answer_key_matched !== true },
    ISOLATED_GRADE: {
      pass: runtime.self_graded === false && usedKeys === false,
      detail: `self_graded=${runtime.self_graded} usedKeys=${usedKeys}`,
    },
  };

  const masteryPass =
    waikeMasteryPass === true && Object.values(masteryChildren).every((c) => c.pass);
  assertNoFalseMasteryPass(primaryOverall, masteryPass);

  const tokens = buildMasteryTokens({
    masteryPass,
    infraSmoke,
    usedInstructorKeysDuringSolve: usedKeys,
    corpusDiscoveryPass,
    noKeyLeakPass: canary.pass,
  });

  const report: MasteryEvalReport = {
    suite: 'AI_WAIKE_MASTERY_EVAL',
    wave: 'AI-WAIKE-MASTERY-002',
    corpus: {
      discoverable_courses: discovered.course_count,
      course_ids: discovered.courses.map((c) => c.course_id),
      waike_root: waikeRoot,
      hardcoded_course_names: false,
    },
    children: infraChildren,
    mastery_children: masteryChildren,
    mastery_scores: masteryScores,
    runtime_solver: runtime,
    tool_use: toolUse,
    canary,
    course_honesty: honesty,
    diagnosis_remediation: {
      open_loop_final: openLoop.finalEvidenceState,
      closed_loop_final: closedLoop.finalEvidenceState,
    },
    educator_mode: educator,
    tokens,
    open: [
      'WAIKE_AI_DIGITAL_MASTERY_PASS false until all mastery_children pass.',
      'Runtime solver uses llama.cpp when memory/model allow; else BLOCKED_* without key matching.',
      'Historical 0.644 preserved as MASTERY_001_NINE_COURSE_BASELINE.',
      'Tool-use PARTIAL ≠ COMPLETE. REAL_*/HUMAN_E6/ACCREDITED remain false.',
      'gunnchAI #36 inspect-only (not a fourth stream). device-os #116 untouched.',
    ],
    WAIKE_AI_DIGITAL_MASTERY_PASS: tokens[MASTERY_PASS_TOKEN],
    AI_WAIKE_MASTERY_INFRA_SMOKE_PASS: tokens[INFRA_SMOKE_TOKEN],
    WAIKE_AI_STUDENT_CORPUS_DISCOVERY_PASS: corpusDiscoveryPass,
    WAIKE_AI_NO_KEY_LEAK_PASS: canary.pass,
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AI_WAIKE_MASTERY_EVAL.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
