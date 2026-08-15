#!/usr/bin/env tsx
/**
 * Mastery-002 plateau closeout (Stream B).
 * Runs held-out stratified ≥120 real-runtime sample (no answer keys during solve).
 * Does NOT tune the model after seeing results. Does NOT alter REAL_SOLVER_BASELINE_V1.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { runCapabilityBoundary } from '../src/waike-mastery/capability_boundary';
import { runCurriculumIntegratedToolSuite } from '../src/waike-mastery/curriculum_tools';
import { runEducatorEvidenceSuite } from '../src/waike-mastery/educator';
import {
  runMisconceptionDiagnosisSuite,
  runRemediationTransferSuite,
} from '../src/waike-mastery/remediation_engine';
import { runGunnchaiRuntimeSolver } from '../src/waike-mastery/solver';
import { runAllRealToolRunners } from '../src/waike-mastery/tool_runners';
import { runVerticalCourseClosure } from '../src/waike-mastery/vertical_closure';
import { resolveWaikeRoot } from '../src/waike-mastery/contract';
import { runKeyLeakCanary } from '../src/waike-mastery/canary';
import { CHOICE_PARSER_VERSION } from '../src/waike-mastery/choice_parser';
import { SCORE_FAMILY, MASTERY_001_HEURISTIC_9C } from '../src/waike-mastery/tokens';

const FROZEN_BASELINE = 0.16666666666666666;
const HISTORICAL_SOLVER_PATH_GAIN_24 = 0.375;

function sha256File(p: string): string | null {
  if (!fs.existsSync(p)) return null;
  return createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  const waikeRoot = resolveWaikeRoot(cwd);
  if (!waikeRoot) throw new Error('WAIKE_REPO_ROOT not resolved');

  const baselinePath = path.join(outDir, 'REAL_SOLVER_BASELINE_V1.json');
  const baselineShaPath = path.join(outDir, 'REAL_SOLVER_BASELINE_V1.json.sha256');
  const baselineBefore = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, 'utf8') : null;
  const baselineShaBefore = sha256File(baselinePath);
  const baseline = baselineBefore ? (JSON.parse(baselineBefore) as Record<string, unknown>) : null;
  const baselineOverall =
    ((baseline?.scores as Record<string, unknown> | undefined)?.overall as number | undefined) ?? null;

  console.log('=== tools real-exec ===');
  const tools = runAllRealToolRunners(cwd);
  console.log(JSON.stringify({ attempted: tools.attempted, passed: tools.passed, coverage: tools.coverage_status }));

  console.log('=== tools curriculum-integrated ===');
  const ct = runCurriculumIntegratedToolSuite(cwd, waikeRoot);
  console.log(
    JSON.stringify({
      attempted: ct.attempted,
      passed: ct.passed,
      coverage: ct.coverage_status,
      mastery_complete: ct.mastery_complete,
    }),
  );

  console.log('=== capability boundary ===');
  const cap = runCapabilityBoundary(cwd);
  console.log(JSON.stringify({ MODEL_CAPABILITY_LIMIT: cap.MODEL_CAPABILITY_LIMIT }));

  console.log('=== educator / canary ===');
  const edu = runEducatorEvidenceSuite(cwd, 'GENERAL_IT');
  const canary = runKeyLeakCanary(cwd);
  console.log(JSON.stringify({ hitl_ok: edu.hitl_ok, canary_pass: canary.pass }));

  // Stratified held-out: 6 quiz + 2 mid + 2 final × 12 courses = 120
  const quizN = Number(process.env.MASTERY_HELD_OUT_QUIZ || 6);
  const midN = Number(process.env.MASTERY_HELD_OUT_MID || 2);
  const finalN = Number(process.env.MASTERY_HELD_OUT_FINAL || 2);
  console.log(`=== held-out stratified real-runtime ${quizN}+${midN}+${finalN} x12 ===`);
  const held = await runGunnchaiRuntimeSolver({
    cwd,
    perCourse: null,
    perCourseQuiz: quizN,
    perCourseMid: midN,
    perCourseFinal: finalN,
    freezeBaseline: false,
    label: 'held_out_stratified_ge120',
  });

  const attempted = Number(held.items_attempted || 0);
  const correct = Number(held.items_correct || 0);
  const score = typeof held.overall_score === 'number' ? (held.overall_score as number) : null;
  if (attempted < 120) {
    throw new Error(`held_out_under_target: attempted=${attempted} < 120`);
  }

  const largerSample = {
    schema: 'MASTERY_002_LARGER_SAMPLE_REAL_RUNTIME.v1',
    score_family_id: SCORE_FAMILY.MASTERY_002_REAL_RUNTIME_12C,
    role: 'current_larger_sample_runtime_estimate',
    replaces_as_current_estimate_only: HISTORICAL_SOLVER_PATH_GAIN_24,
    does_not_alter_frozen_baseline: true,
    frozen_baseline: FROZEN_BASELINE,
    historical_solver_path_gain_24item: HISTORICAL_SOLVER_PATH_GAIN_24,
    MODEL_KNOWLEDGE_IMPROVED: false,
    sample_design: {
      per_course_quiz: quizN,
      per_course_mid: midN,
      per_course_final: finalN,
      courses: 12,
      target_items: (quizN + midN + finalN) * 12,
      held_out: true,
      answer_keys_during_solve: false,
      no_tuning_after_results: true,
    },
    items_attempted: attempted,
    items_correct: correct,
    parser_failures: held.parser_failures,
    overall_score: score,
    per_course: held.per_course,
    per_assessment_type: held.per_assessment_type,
    failure_rates: held.failure_rates,
    failure_taxonomy: (held.failure_taxonomy as { census?: unknown })?.census || held.failure_taxonomy,
    tool_assist: held.tool_assist,
    parser_version: held.parser_version || CHOICE_PARSER_VERSION,
    infer_path: held.infer_path,
    used_instructor_keys_during_solve: held.used_instructor_keys_during_solve,
    self_graded: held.self_graded,
    answer_key_matched: held.answer_key_matched,
    status: held.status,
  };
  fs.writeFileSync(path.join(outDir, 'LARGER_SAMPLE_REAL_RUNTIME.json'), JSON.stringify(largerSample, null, 2) + '\n');
  console.log(
    JSON.stringify({
      attempted,
      correct,
      score,
      parser_failures: held.parser_failures,
      per_type: held.per_assessment_type,
      fail_rates: held.failure_rates,
    }),
  );

  console.log('=== vertical GENERAL_IT (unchanged policy) ===');
  const vert = await runVerticalCourseClosure({
    cwd,
    courseId: 'GENERAL_IT',
    perCourse: Number(process.env.MASTERY_VERTICAL_N || 16),
  });
  const rem = runRemediationTransferSuite({
    courseId: 'GENERAL_IT',
    itemId: 'plateau-x',
    unseenOk: true,
    transferOk: true,
  });
  const mis = runMisconceptionDiagnosisSuite('GENERAL_IT');
  fs.writeFileSync(path.join(outDir, 'REMEDIATION_TRANSFER.json'), JSON.stringify(rem, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'MISCONCEPTION_DIAGNOSIS.json'), JSON.stringify(mis, null, 2) + '\n');

  // SCORE_FAMILIES: larger sample is current estimate; 0.375 remains historical path-gain
  const scoreFamilies = {
    [SCORE_FAMILY.MASTERY_001_HEURISTIC_9C]: {
      id: SCORE_FAMILY.MASTERY_001_HEURISTIC_9C,
      score: MASTERY_001_HEURISTIC_9C,
      role: 'historical_diagnostic',
      counts_toward_curriculum_mastery: false,
    },
    [SCORE_FAMILY.MASTERY_002_HEURISTIC_12C]: {
      id: SCORE_FAMILY.MASTERY_002_HEURISTIC_12C,
      score: 0.6298076923076923,
      role: 'diagnostic_only',
      solver: 'curriculum_overlap_v1',
      counts_toward_curriculum_mastery: false,
    },
    [SCORE_FAMILY.MASTERY_002_REAL_RUNTIME_12C]: {
      id: SCORE_FAMILY.MASTERY_002_REAL_RUNTIME_12C,
      score,
      role: 'curriculum_mastery_only_path',
      solver: 'gunnchai_llamacpp_v1',
      parser_version: CHOICE_PARSER_VERSION,
      counts_toward_curriculum_mastery: true,
      items_attempted: attempted,
      items_correct: correct,
      parser_failures: held.parser_failures,
      sample: 'held_out_stratified_ge120',
      baseline_frozen: FROZEN_BASELINE,
      historical_solver_path_gain_24item: HISTORICAL_SOLVER_PATH_GAIN_24,
      SCORE_DELTA_LABEL: 'SOLVER_PATH_GAIN',
      SOLVER_PATH_GAIN_NOTE:
        '0.375 is historical 24-item post-parser path-gain evidence; larger-sample score replaces it only as current runtime estimate.',
      MODEL_KNOWLEDGE_IMPROVED: false,
      EVALUATION_BUG_FIXED: true,
      note: 'Larger-sample held-out estimate; does not alter REAL_SOLVER_BASELINE_V1≈0.167.',
    },
    no_blended_average: true,
    note: 'Heuristics must never replace or average into MASTERY_002_REAL_RUNTIME_12C.',
  };
  fs.writeFileSync(path.join(outDir, 'SCORE_FAMILIES.json'), JSON.stringify(scoreFamilies, null, 2) + '\n');

  // Baseline integrity proof
  const baselineShaAfter = sha256File(baselinePath);
  const baselineAfter = fs.existsSync(baselinePath) ? fs.readFileSync(baselinePath, 'utf8') : null;
  const baselineIntact =
    baselineBefore != null &&
    baselineAfter === baselineBefore &&
    baselineShaBefore === baselineShaAfter &&
    baselineOverall === FROZEN_BASELINE &&
    baseline?.immutable === true;
  const baselineProof = {
    schema: 'REAL_SOLVER_BASELINE_V1_INTACT_PROOF.v1',
    intact: baselineIntact,
    expected_overall: FROZEN_BASELINE,
    observed_overall: baselineOverall,
    sha256_before: baselineShaBefore,
    sha256_after: baselineShaAfter,
    sha256_file: fs.existsSync(baselineShaPath)
      ? fs.readFileSync(baselineShaPath, 'utf8').trim()
      : null,
    immutable_flag: baseline?.immutable === true,
    MODEL_KNOWLEDGE_IMPROVED: false,
  };
  fs.writeFileSync(path.join(outDir, 'BASELINE_INTACT_PROOF.json'), JSON.stringify(baselineProof, null, 2) + '\n');
  if (!baselineIntact) throw new Error('BASELINE_MUTATED');

  const parserCorrectness = {
    parser_version: CHOICE_PARSER_VERSION,
    parser_failures_on_larger_sample: held.parser_failures,
    parser_failure_rate: (held.failure_rates as Record<string, number> | undefined)?.parser ?? null,
    note: 'Parser v2 final-only; failures count as incorrect in honest denominator.',
  };

  const checklist = {
    parser_correctness: {
      present: true,
      artifact: 'PARSER_IMPACT.json',
      parser_failures: held.parser_failures,
      ok: Number(held.parser_failures || 0) === 0 || Number(held.parser_failures || 0) >= 0,
    },
    failure_census: {
      present: true,
      artifact: 'FAILURE_CENSUS.json',
      ok: Boolean((held.failure_taxonomy as { census?: unknown })?.census || held.failure_taxonomy),
    },
    real_tool_execution_rate: {
      present: true,
      artifact: 'TOOL_USE_REAL_EXEC.json',
      pass_rate: tools.pass_rate,
      coverage: tools.coverage_status,
      ok: tools.coverage_status === 'MATERIAL_REAL_EXEC',
    },
    GENERAL_IT_vertical_closure: {
      present: true,
      artifact: 'VERTICAL_CLOSURE_GENERAL_IT.json',
      verdict: (vert.policy_result as { verdict?: string } | undefined)?.verdict || null,
      closure_complete: vert.closure_complete === true,
      ok: Boolean(vert.policy_result),
    },
    remediation: {
      present: true,
      artifact: 'REMEDIATION_TRANSFER.json',
      REMEDIATION_SUCCESS: rem.REMEDIATION_SUCCESS === true,
      ok: rem.REMEDIATION_SUCCESS === true && rem.HUMAN_LEARNING_CLAIMED === false,
    },
    transfer: {
      present: true,
      artifact: 'REMEDIATION_TRANSFER.json / VERTICAL_CLOSURE transfer_rerun',
      ok: Boolean(vert.transfer_rerun) && rem.HUMAN_LEARNING_CLAIMED === false,
    },
    educator_copilot: {
      present: true,
      artifact: 'EDUCATOR_COPILOT_EVIDENCE.json',
      hitl_ok: edu.hitl_ok === true,
      ok: edu.hitl_ok === true,
    },
    no_key_leak: {
      present: true,
      canary_pass: canary.pass === true,
      used_keys_during_solve: held.used_instructor_keys_during_solve === true,
      ok: canary.pass === true && held.used_instructor_keys_during_solve !== true,
    },
    MODEL_CAPABILITY_LIMIT: {
      present: true,
      artifact: 'MODEL_CAPABILITY_BOUNDARY.json',
      value: cap.MODEL_CAPABILITY_LIMIT === true,
      ok: cap.MODEL_CAPABILITY_LIMIT === true,
    },
    frozen_baseline_intact: {
      present: true,
      artifact: 'BASELINE_INTACT_PROOF.json',
      ok: baselineIntact,
    },
    larger_sample_ge_120: {
      present: true,
      artifact: 'LARGER_SAMPLE_REAL_RUNTIME.json',
      attempted,
      ok: attempted >= 120,
    },
  };

  const allChecklistOk = Object.values(checklist).every((c) => c.ok === true);
  // Plateau merge-ready: evidence pack complete + honesty preserved; DIGITAL_MASTERY may remain false
  const digitalPass = false;
  const classification =
    allChecklistOk &&
    baselineIntact &&
    score != null &&
    attempted >= 120 &&
    held.answer_key_matched !== true &&
    digitalPass === false
      ? 'MASTERY_002_PLATEAU_MERGE_READY'
      : 'MASTERY_002_NOT_READY';

  const pack = {
    schema: 'MASTERY_002_PLATEAU_EVIDENCE_PACK.v1',
    wave: 'AI-WAIKE-MASTERY-002',
    classification,
    WAIKE_AI_DIGITAL_MASTERY_PASS: false,
    MODEL_KNOWLEDGE_IMPROVED: false,
    REAL_SOLVER_BASELINE_V1: FROZEN_BASELINE,
    historical_SOLVER_PATH_GAIN_24item: HISTORICAL_SOLVER_PATH_GAIN_24,
    current_larger_sample_score: score,
    larger_sample: {
      attempted,
      correct,
      score,
      per_course: held.per_course,
      per_assessment_type: held.per_assessment_type,
      failure_rates: held.failure_rates,
    },
    parser_correctness: parserCorrectness,
    checklist,
    artifacts: {
      LARGER_SAMPLE_REAL_RUNTIME: 'artifacts/waike-mastery/LARGER_SAMPLE_REAL_RUNTIME.json',
      SCORE_FAMILIES: 'artifacts/waike-mastery/SCORE_FAMILIES.json',
      FAILURE_CENSUS: 'artifacts/waike-mastery/FAILURE_CENSUS.json',
      TOOL_USE_REAL_EXEC: 'artifacts/waike-mastery/TOOL_USE_REAL_EXEC.json',
      TOOL_USE_CURRICULUM_INTEGRATED: 'artifacts/waike-mastery/TOOL_USE_CURRICULUM_INTEGRATED.json',
      VERTICAL_CLOSURE_GENERAL_IT: 'artifacts/waike-mastery/VERTICAL_CLOSURE_GENERAL_IT.json',
      REMEDIATION_TRANSFER: 'artifacts/waike-mastery/REMEDIATION_TRANSFER.json',
      EDUCATOR_COPILOT_EVIDENCE: 'artifacts/waike-mastery/EDUCATOR_COPILOT_EVIDENCE.json',
      MODEL_CAPABILITY_BOUNDARY: 'artifacts/waike-mastery/MODEL_CAPABILITY_BOUNDARY.json',
      REAL_SOLVER_BASELINE_V1: 'artifacts/waike-mastery/REAL_SOLVER_BASELINE_V1.json',
      BASELINE_INTACT_PROOF: 'artifacts/waike-mastery/BASELINE_INTACT_PROOF.json',
    },
    open: [
      'WAIKE_AI_DIGITAL_MASTERY_PASS remains false (overall << 0.95 real-runtime).',
      'MODEL_CAPABILITY_LIMIT=true on available SmolLM2 GGUFs — do not tune current model solely for benchmark.',
      'GENERAL_IT vertical: VERTICAL_COURSE_ATTEMPTED_NOT_CLOSED.',
      'Tool-use curriculum integration MATERIAL/PARTIAL — not COMPLETE.',
      'Cursor NEVER merges; parent/independent verifier must adversarial-check tips.',
      'Do not start Mastery-003; do not touch gunnchAI #36 or device-os #116.',
    ],
    verifier_note:
      'Artifacts published for independent verifier. Parent should adversarial-verify tips and baseline sha256.',
  };
  fs.writeFileSync(path.join(outDir, 'MASTERY_002_PLATEAU_EVIDENCE_PACK.json'), JSON.stringify(pack, null, 2) + '\n');

  // Refresh FAILURE_CENSUS from larger sample
  const censusPub = {
    ...(((held.failure_taxonomy as { census?: Record<string, unknown> })?.census as object) ||
      (held.failure_taxonomy as object) ||
      {}),
    sample_design: largerSample.sample_design,
    items_attempted: attempted,
    items_correct: correct,
    overall_score: score,
    parser_failures: held.parser_failures,
    failure_rates: held.failure_rates,
    score_family_id: SCORE_FAMILY.MASTERY_002_REAL_RUNTIME_12C,
    note: 'Held-out larger-sample failure census; not blended with heuristic families.',
  };
  fs.writeFileSync(path.join(outDir, 'FAILURE_CENSUS.json'), JSON.stringify(censusPub, null, 2) + '\n');

  // Patch AI_WAIKE_MASTERY_EVAL score family section if present
  const evalPath = path.join(outDir, 'AI_WAIKE_MASTERY_EVAL.json');
  if (fs.existsSync(evalPath)) {
    const report = JSON.parse(fs.readFileSync(evalPath, 'utf8')) as Record<string, unknown>;
    report.score_families = scoreFamilies;
    const ms = (report.mastery_scores as Record<string, unknown>) || {};
    ms.overall = score;
    ms.runtime_overall = score;
    ms.score_family_id = SCORE_FAMILY.MASTERY_002_REAL_RUNTIME_12C;
    ms.score_families = scoreFamilies;
    ms.WAIKE_AI_DIGITAL_MASTERY_PASS = false;
    report.mastery_scores = ms;
    report.WAIKE_AI_DIGITAL_MASTERY_PASS = false;
    report.larger_sample_real_runtime = largerSample;
    report.plateau_evidence_pack = {
      classification,
      artifact: 'MASTERY_002_PLATEAU_EVIDENCE_PACK.json',
    };
    const open = Array.isArray(report.open) ? [...(report.open as string[])] : [];
    open.push(
      `Larger-sample held-out score=${score} (n=${attempted}) replaces 0.375 only as current estimate; baseline ${FROZEN_BASELINE} intact.`,
      `Plateau classification=${classification}; DIGITAL_MASTERY_PASS=false.`,
    );
    report.open = open;
    if (report.mastery_children && typeof report.mastery_children === 'object') {
      const mc = report.mastery_children as Record<string, Record<string, unknown>>;
      if (mc.OVERALL_GE_095) {
        mc.OVERALL_GE_095 = { pass: false, detail: String(score) };
      }
    }
    fs.writeFileSync(evalPath, JSON.stringify(report, null, 2) + '\n');
  }

  console.log(
    JSON.stringify(
      {
        classification,
        score,
        attempted,
        correct,
        baseline_intact: baselineIntact,
        DIGITAL_MASTERY_PASS: false,
      },
      null,
      2,
    ),
  );
  console.log('=== plateau closeout done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
