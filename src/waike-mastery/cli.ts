#!/usr/bin/env tsx
import {
  assertNoFalseMasteryPass,
  CORPUS_DISCOVERY_TOKEN,
  INFRA_SMOKE_TOKEN,
  MASTERY_PASS_TOKEN,
  NO_KEY_LEAK_TOKEN,
} from './tokens';
import { runMasteryEvalSuite } from './eval_suite';

async function main(): Promise<void> {
  const report = await runMasteryEvalSuite(process.cwd());
  const overall =
    report.mastery_scores && typeof report.mastery_scores.overall === 'number'
      ? (report.mastery_scores.overall as number)
      : null;

  const summary = {
    suite: report.suite,
    wave: report.wave,
    WAIKE_AI_DIGITAL_MASTERY_PASS: report.WAIKE_AI_DIGITAL_MASTERY_PASS,
    AI_WAIKE_MASTERY_INFRA_SMOKE_PASS: report.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS,
    WAIKE_AI_STUDENT_CORPUS_DISCOVERY_PASS: report.WAIKE_AI_STUDENT_CORPUS_DISCOVERY_PASS,
    WAIKE_AI_NO_KEY_LEAK_PASS: report.WAIKE_AI_NO_KEY_LEAK_PASS,
    overall_score: overall,
    runtime_status: (report.mastery_scores as { runtime_status?: string } | null)?.runtime_status,
    courses: report.corpus.discoverable_courses,
    canary: report.canary.pass,
    tokens: report.tokens,
    failed: Object.entries(report.children)
      .filter(([, v]) => !v.pass)
      .map(([k]) => k),
    mastery_failed: Object.entries(report.mastery_children)
      .filter(([, v]) => !v.pass)
      .map(([k]) => k),
    open: report.open,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (
    report.tokens.REAL_STUDENT !== false ||
    report.tokens.HUMAN_E6 !== false ||
    report.tokens.ACCREDITED !== false
  ) {
    process.exit(2);
  }

  try {
    assertNoFalseMasteryPass(overall, report.tokens[MASTERY_PASS_TOKEN]);
  } catch {
    process.exit(2);
  }

  if (report.tokens[MASTERY_PASS_TOKEN] === true && (overall == null || overall < 0.95)) {
    process.exit(2);
  }

  if (!report.tokens[INFRA_SMOKE_TOKEN]) {
    process.exit(1);
  }

  // Discovery token must be earned on current universe when WAIKE is present
  if (report.corpus.waike_root && !report.tokens[CORPUS_DISCOVERY_TOKEN]) {
    process.exit(1);
  }
  if (!report.tokens[NO_KEY_LEAK_TOKEN]) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
