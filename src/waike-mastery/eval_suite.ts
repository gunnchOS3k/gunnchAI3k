/**
 * AI_WAIKE_MASTERY_EVAL suite — aggregate WAIKE_AI_DIGITAL_MASTERY_PASS only if all children pass.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runKeyLeakCanary } from './canary';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';
import { diagnose, runRemediationLoop } from './diagnosis';
import { proposeGradeAssist, runEducatorCopilot } from './educator';
import { assertModePermission, createModeSession, MODE_PERMISSIONS } from './modes';
import { buildMasteryTokens, MASTERY_PASS_TOKEN } from './tokens';

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
}

function loadWaikeEval(waikeRoot: string | null): Record<string, unknown> | null {
  if (!waikeRoot) return null;
  const p = path.join(waikeRoot, 'artifacts', 'mastery', 'AI_WAIKE_MASTERY_EVAL.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
}

function ensureWaikeArtifacts(waikeRoot: string): Record<string, unknown> | null {
  const existing = loadWaikeEval(waikeRoot);
  if (existing) return existing;
  const script = path.join(waikeRoot, 'scripts', 'emit_waike_mastery.py');
  if (!fs.existsSync(script)) return null;
  const r = spawnSync('python3', [script], { cwd: waikeRoot, encoding: 'utf8', timeout: 120_000 });
  if (r.status !== 0) {
    return { emit_failed: true, stderr: r.stderr, stdout: r.stdout };
  }
  return loadWaikeEval(waikeRoot);
}

export async function runMasteryEvalSuite(cwd = process.cwd()): Promise<MasteryEvalReport> {
  const waikeRoot = resolveWaikeRoot(cwd);
  const discovered = waikeRoot
    ? discoverCoursesFromContract(waikeRoot)
    : { course_count: 0, courses: [] as { course_id: string }[], hardcoded_course_names: false as const };

  const waikeEval = waikeRoot ? ensureWaikeArtifacts(waikeRoot) : null;

  // Mode separation
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
  const waikeChildren = (waikeEval?.children as Record<string, { pass: boolean }>) || null;

  const children: MasteryEvalReport['children'] = {
    MODE_SEPARATION: { pass: modePass, detail: modeDetail },
    LEARNING_CONTRACT_DISCOVERY: {
      pass: discovered.course_count >= 9 && discovered.hardcoded_course_names === false,
      detail: `courses=${discovered.course_count}`,
    },
    KEY_LEAK_CANARY: { pass: canary.pass, detail: canary.detail },
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
    WAIKE_CORPUS_EVAL: {
      pass: Boolean(waikeEval && waikeEval.WAIKE_AI_DIGITAL_MASTERY_PASS === true),
      detail: waikeEval
        ? `waike_pass=${waikeEval.WAIKE_AI_DIGITAL_MASTERY_PASS}`
        : 'waike artifacts missing',
    },
  };

  // If waike children present, require their passes too for aggregate
  if (waikeChildren) {
    for (const [k, v] of Object.entries(waikeChildren)) {
      children[`WAIKE_${k}`] = { pass: Boolean(v.pass) };
    }
  }

  const allPass = Object.values(children).every((c) => c.pass);
  const tokens = buildMasteryTokens(allPass);

  const report: MasteryEvalReport = {
    suite: 'AI_WAIKE_MASTERY_EVAL',
    corpus: {
      discoverable_courses: discovered.course_count,
      course_ids: discovered.courses.map((c) => c.course_id),
      waike_root: waikeRoot,
    },
    children,
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
      'REAL_STUDENT / REAL_TEACHER / HUMAN_E6 / ACCREDITED remain false without evidence.',
      'Standalone AI-004 (#36) and WAIKE-004 (#46) are not this stream’s primary deliverable.',
      'Product-Use device-os #116 is out of scope — do not collide.',
      'MCQ mastery uses curriculum-overlap digital solver — not a claim of human exam proctoring.',
    ],
    WAIKE_AI_DIGITAL_MASTERY_PASS: tokens[MASTERY_PASS_TOKEN],
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'AI_WAIKE_MASTERY_EVAL.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
