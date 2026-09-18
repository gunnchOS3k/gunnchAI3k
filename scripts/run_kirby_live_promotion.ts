#!/usr/bin/env tsx
/**
 * KIRBY-3 live provider promotion entrypoint.
 * Updates gates/KIRBY_GATES.json with live tokens (honest fail-closed).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runLivePromotion } from '../benchmarks/frontier_live/run_live_promotion';

const ROOT = process.env.GUNNCHAI_ROOT
  ? path.resolve(process.env.GUNNCHAI_ROOT)
  : path.resolve(__dirname, '..');

async function main(): Promise<void> {
  const result = await runLivePromotion(ROOT);

  const gatesPath = path.join(ROOT, 'gates/KIRBY_GATES.json');
  const gates = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));
  gates.schema = 'gunnchai.kirby_gates.v3_live';
  gates.claim_boundary =
    'Live tokens reflect real Mac/Pixel evidence only. Simulated adapters never LIVE_QUALIFIED. No production default pin.';
  gates.live = gates.live || {};
  for (const [k, v] of Object.entries(result.gates)) {
    gates.tokens[k] = {
      status: v.status,
      evidence: v.evidence,
      detail: v.detail,
      value: v.value,
    };
    gates.live[k] = v;
  }
  gates.tokens.KIRBY_LIVE_PROVIDER_PROMOTION = {
    status: result.summary.microPass ? 'PASS' : 'FAIL',
    evidence: ['artifacts/kirby_v2/live/', 'docs/frontier/KIRBY2_LIVE_EVIDENCE_REBIND.md'],
    next: result.nextAction,
    detail: JSON.stringify(result.summary),
  };
  gates.next_gunnchai_action = result.nextAction;
  fs.writeFileSync(gatesPath, JSON.stringify(gates, null, 2) + '\n');

  const mdPath = path.join(ROOT, 'gates/KIRBY_GATES.md');
  const liveLines = [
    '',
    '## KIRBY-3 live provider promotion',
    '',
    ...Object.entries(result.gates).map(
      ([k, v]) => `- **${k}**: ${v.status}${v.detail ? ` — ${v.detail}` : ''}`,
    ),
    '',
    `Next: \`${result.nextAction}\``,
    '',
  ];
  let md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '# Kirby Gates\n';
  if (!md.includes('## KIRBY-3 live provider promotion')) {
    md = md.trimEnd() + '\n' + liveLines.join('\n');
  } else {
    md = md.replace(/## KIRBY-3 live provider promotion[\s\S]*$/m, liveLines.join('\n').trimStart());
  }
  fs.writeFileSync(mdPath, md.endsWith('\n') ? md : md + '\n');

  const gateReport = {
    schema: 'kirby.live.gate_report.v1',
    captured_at: new Date().toISOString(),
    gates: result.gates,
    summary: result.summary,
    next: result.nextAction,
  };
  fs.mkdirSync(path.join(ROOT, 'artifacts/kirby_v2/live'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'artifacts/kirby_v2/live/GATE_REPORT.json'),
    JSON.stringify(gateReport, null, 2) + '\n',
  );

  console.log(JSON.stringify({ ok: true, outDir: result.outDir, next: result.nextAction, summary: result.summary }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
