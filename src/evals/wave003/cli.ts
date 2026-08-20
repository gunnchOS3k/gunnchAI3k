import { exitCodeForReport, runWave003Eval } from './runner';

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const isChild = args.has('--reproduction-child');
  const report = await runWave003Eval({
    writeEvidence: !args.has('--no-evidence') && !isChild,
    runCrossCheck: !args.has('--no-crosscheck'),
    runReproduction: !isChild && !args.has('--no-reproduction'),
  });

  const validated = report.summary.validated;
  const total = report.summary.total;
  console.log(
    JSON.stringify(
      {
        wave: '003',
        validated,
        total,
        independentDigitalReproduction: report.independentDigitalReproduction,
        releaseComplete: report.releaseComplete,
        open: report.summary.implementedValidationOpen,
      },
      null,
      2,
    ),
  );

  if (isChild) {
    process.exit(0);
  }
  process.exit(exitCodeForReport(report));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
