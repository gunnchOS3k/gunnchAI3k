#!/usr/bin/env tsx
import * as path from 'node:path';
import { runProviderBakeoff } from '../benchmarks/frontier_bakeoff/run_bakeoff';

async function main(): Promise<void> {
  const root = path.resolve(__dirname, '..');
  const result = await runProviderBakeoff(root);
  console.log(
    JSON.stringify(
      {
        ok: true,
        outDir: result.outDir,
        summary: result.summary,
        gates: Object.fromEntries(Object.entries(result.gateTokens).map(([k, v]) => [k, v.status])),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
