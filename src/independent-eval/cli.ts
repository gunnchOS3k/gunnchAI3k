import { runIndependentEvals } from './runner';
import { APP_PRODUCT_COMPLETE_TOKEN, FRONTIER_PARITY_TOKEN, INDEPENDENT_EVAL_TOKEN } from './tokens';

async function main(): Promise<void> {
  const report = await runIndependentEvals(process.cwd(), { writeArtifacts: true });
  const summary = {
    allDigitalPassed: report.allDigitalPassed,
    passedCount: report.passedCount,
    totalCount: report.totalCount,
    tokens: report.tokens,
    experiencePixels: report.experience.pixels,
    llamaNano: {
      canRun: report.audit.llama.canRunRealInference,
      labeledNanoFallbackOnly: report.audit.llama.labeledNanoFallbackOnly,
      contextSize: report.audit.llama.contextSize,
    },
    localFastWeightsPresent: report.audit.localFastWeightsPresent,
    localProWeightsPresent: report.audit.localProWeightsPresent,
    failed: report.results.filter((r) => !r.passed).map((r) => r.id),
    open: report.open,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (report.tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) process.exit(2);
  if (report.tokens[FRONTIER_PARITY_TOKEN] !== false) process.exit(2);
  if (!report.allDigitalPassed || report.tokens[INDEPENDENT_EVAL_TOKEN] !== true) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
