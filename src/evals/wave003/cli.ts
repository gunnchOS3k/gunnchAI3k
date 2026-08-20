import { exitCodeForReport, runWave003Eval } from './runner';

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const report = await runWave003Eval({
    writeEvidence: !args.has('--no-evidence'),
    runCrossCheck: !args.has('--no-crosscheck'),
    runReproduction: !args.has('--reproduction-child') && !args.has('--no-reproduction'),
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
        open: report.summary.implementedValidationOpen,
      },
      null,
      2,
    ),
  );

  if (args.has('--reproduction-child')) {
    process.exit(report.summary.implementedValidationOpen > 0 ? 2 : 0);
  }
  process.exit(exitCodeForReport(report));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
