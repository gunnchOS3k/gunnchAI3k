#!/usr/bin/env tsx
import { MASTERY_PASS_TOKEN } from './tokens';
import { runMasteryEvalSuite } from './eval_suite';

async function main(): Promise<void> {
  const report = await runMasteryEvalSuite(process.cwd());
  const summary = {
    suite: report.suite,
    WAIKE_AI_DIGITAL_MASTERY_PASS: report.WAIKE_AI_DIGITAL_MASTERY_PASS,
    courses: report.corpus.discoverable_courses,
    canary: report.canary.pass,
    tokens: report.tokens,
    failed: Object.entries(report.children)
      .filter(([, v]) => !v.pass)
      .map(([k]) => k),
    open: report.open,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (report.tokens.REAL_STUDENT !== false || report.tokens.HUMAN_E6 !== false || report.tokens.ACCREDITED !== false) {
    process.exit(2);
  }
  if (!report.WAIKE_AI_DIGITAL_MASTERY_PASS || report.tokens[MASTERY_PASS_TOKEN] !== true) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
