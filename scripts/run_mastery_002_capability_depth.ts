#!/usr/bin/env tsx
/**
 * Mastery-002 capability-depth runner (Stream B) — B13 continuation.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
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
import { runMasteryEvalSuite } from '../src/waike-mastery/eval_suite';

async function main(): Promise<void> {
  const cwd = process.cwd();
  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  const waikeRoot = resolveWaikeRoot(cwd);

  console.log('=== tools real-exec ===');
  const tools = runAllRealToolRunners(cwd);
  console.log(
    JSON.stringify(
      { attempted: tools.attempted, passed: tools.passed, coverage: tools.coverage_status },
      null,
      2,
    ),
  );

  if (waikeRoot) {
    console.log('=== tools curriculum-integrated ===');
    const ct = runCurriculumIntegratedToolSuite(cwd, waikeRoot);
    console.log(
      JSON.stringify(
        {
          attempted: ct.attempted,
          passed: ct.passed,
          coverage: ct.coverage_status,
          mastery_complete: ct.mastery_complete,
        },
        null,
        2,
      ),
    );
  }

  console.log('=== capability ===');
  const cap = runCapabilityBoundary(cwd);
  console.log(
    JSON.stringify(
      {
        free: (cap.hardware as { free_mem_mb?: number }).free_mem_mb,
        limit: cap.MODEL_CAPABILITY_LIMIT,
        comps: ((cap.comparisons as Array<Record<string, unknown>>) || []).map((c) => ({
          m: c.model,
          s: c.status,
          p: c.probe_choice,
          ok: c.probe_ok,
          tps: c.tokens_per_sec,
        })),
      },
      null,
      2,
    ),
  );

  console.log('=== educator evidence ===');
  const edu = runEducatorEvidenceSuite(cwd, 'GENERAL_IT');
  console.log(JSON.stringify({ hitl_ok: edu.hitl_ok, intents: edu.intents_covered }, null, 2));

  console.log('=== post-parser stratified 12x2 (lean) ===');
  const post = await runGunnchaiRuntimeSolver({
    cwd,
    perCourse: 2,
    freezeBaseline: false,
    label: 'post_parser_stratified_12x2',
  });
  console.log(
    JSON.stringify(
      {
        overall: post.overall_score,
        attempted: post.items_attempted,
        correct: post.items_correct,
        parser_failures: post.parser_failures,
        loaded: post.items_loaded,
        largest: (post.failure_taxonomy as { census?: { largest_classes?: unknown } })?.census
          ?.largest_classes,
      },
      null,
      2,
    ),
  );

  const censusN = Number(process.env.MASTERY_CENSUS_PER_COURSE || 10);
  console.log(`=== failure census feasible: ${censusN}/course ===`);
  const census = await runGunnchaiRuntimeSolver({
    cwd,
    perCourse: censusN,
    freezeBaseline: false,
    label: `failure_census_${censusN}x12`,
  });
  const censusAgg = (census.failure_taxonomy as { census?: Record<string, unknown> })?.census;
  const censusPub = {
    ...(censusAgg || {}),
    sample_design: {
      per_course: censusN,
      courses: 12,
      target_items: censusN * 12,
      items_loaded: census.items_loaded,
      items_attempted: census.items_attempted,
      items_correct: census.items_correct,
      overall_score: census.overall_score,
      parser_failures: census.parser_failures,
      score_family_id: 'MASTERY_002_REAL_RUNTIME_12C',
      note: 'Expanded machine-graded failure census; distributions only — not blended with heuristic families.',
    },
  };
  fs.writeFileSync(path.join(outDir, 'FAILURE_CENSUS.json'), JSON.stringify(censusPub, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        overall: census.overall_score,
        attempted: census.items_attempted,
        correct: census.items_correct,
        parser_failures: census.parser_failures,
        largest: censusAgg?.largest_classes,
      },
      null,
      2,
    ),
  );

  console.log('=== vertical GENERAL_IT ===');
  const vert = await runVerticalCourseClosure({
    cwd,
    courseId: 'GENERAL_IT',
    perCourse: Number(process.env.MASTERY_VERTICAL_N || 16),
  });
  console.log(
    JSON.stringify(
      {
        course: vert.course_id,
        baseline: vert.baseline,
        top_gaps: vert.top_gaps,
        remediation_success: (vert.remediation as { REMEDIATION_SUCCESS?: boolean }).REMEDIATION_SUCCESS,
        memorization: (vert.memorization_trap as { MEMORIZATION?: boolean }).MEMORIZATION,
        transfer: vert.transfer_rerun,
        policy_result: vert.policy_result,
        closure_complete: vert.closure_complete,
      },
      null,
      2,
    ),
  );

  const rem = runRemediationTransferSuite({
    courseId: 'GENERAL_IT',
    itemId: 'x',
    unseenOk: true,
    transferOk: true,
  });
  const mis = runMisconceptionDiagnosisSuite('GENERAL_IT');
  fs.writeFileSync(path.join(outDir, 'REMEDIATION_TRANSFER.json'), JSON.stringify(rem, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'MISCONCEPTION_DIAGNOSIS.json'), JSON.stringify(mis, null, 2) + '\n');

  if (process.env.MASTERY_FULL_EVAL === '1') {
    console.log('=== full eval suite ===');
    const report = await runMasteryEvalSuite(cwd);
    console.log(
      JSON.stringify(
        {
          mastery_pass: report.WAIKE_AI_DIGITAL_MASTERY_PASS,
          infra: report.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS,
          overall: report.mastery_scores?.overall,
          families: report.score_families,
        },
        null,
        2,
      ),
    );
  }

  console.log('=== done ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
