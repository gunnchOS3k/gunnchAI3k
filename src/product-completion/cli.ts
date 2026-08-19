import { APP_PRODUCT_COMPLETE_TOKEN, FRONTIER_PARITY_TOKEN, HUMAN_E6_TOKEN } from '../user-ready/tokens';
import { runProductCompletion } from './runtime';

async function main(): Promise<void> {
  const report = await runProductCompletion(process.cwd());
  const results = report.results as Record<string, unknown>;
  console.log(
    JSON.stringify(
      {
        packet: 'GUNNCHAI-DIGITAL-PRODUCT-COMPLETION-001',
        results,
        inflation: report.inflation,
        tokens: report.tokens,
      },
      null,
      2,
    ),
  );
  const tokens = report.tokens as Record<string, unknown>;
  if (tokens[APP_PRODUCT_COMPLETE_TOKEN] !== false) process.exit(2);
  if (tokens[FRONTIER_PARITY_TOKEN] !== false) process.exit(2);
  if (tokens[HUMAN_E6_TOKEN] !== false) process.exit(2);
  if (results.GUNNCHAI_DIGITAL_PRODUCT_CAPABILITY_PASS !== true) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
