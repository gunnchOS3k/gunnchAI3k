import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ACCEPTED_MAIN_SHA,
  CLAIM_BOUNDARIES,
  TARGET_REQUIREMENTS,
  VALIDATION_IMPORTS_REQUIREMENT_PROOF,
  WAVE003_BRANCH,
} from './constants';
import { cleanupWave003Context, createWave003Context } from './context';
import { writeWave003Evidence } from './evidence';
import { writeEvaluationBaseline } from './baseline';
import { evaluateAllAiGov, rescoreAiGov006FromBaseline } from './scorers/ai_gov';
import { evaluateAllAiLocal } from './scorers/ai_local';
import { crossCheckRequirementProof } from './scorers/crosscheck_requirement_proof';
import { releaseComplete, runIndependentReproduction } from './reproduction';
import type { RequirementEvalResult, Wave003Report } from './types';

export interface RunWave003Options {
  cwd?: string;
  writeEvidence?: boolean;
  runCrossCheck?: boolean;
  runReproduction?: boolean;
}

function summarize(results: RequirementEvalResult[]): Wave003Report['summary'] {
  return {
    validated: results.filter((r) => r.validationState === 'VALIDATED').length,
    implementedValidationOpen: results.filter((r) => r.validationState === 'IMPLEMENTED_VALIDATION_OPEN')
      .length,
    reclassify: results.filter((r) => r.validationState === 'RECLASSIFY_TO_DIGITAL_IMPLEMENTATION_OPEN')
      .length,
    blockedEnvironment: results.filter((r) => r.validationState === 'BLOCKED_ENVIRONMENT').length,
    blockedExternal: results.filter((r) => r.validationState === 'BLOCKED_EXTERNAL').length,
    total: results.length,
  };
}

/** @deprecated child-exit inference is not used for PASS. Kept for CLI flag parsing only. */
export function runFreshProcessReproduction(cwd: string): 'PASS' | 'PARTIAL' | 'FAIL' {
  const cli = path.join(cwd, 'src', 'evals', 'wave003', 'cli.ts');
  const child = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', cli, '--reproduction-child', '--no-evidence'],
    {
      cwd,
      env: { ...process.env, GUNNCHAI_WAVE003_REPRODUCTION: '1' },
      encoding: 'utf8',
      timeout: 120_000,
    },
  );
  if (child.status === 0) return 'PARTIAL';
  return 'FAIL';
}

export async function runWave003Eval(opts: RunWave003Options = {}): Promise<Wave003Report> {
  const cwd = opts.cwd ?? process.cwd();
  const ctx = createWave003Context(cwd);

  try {
    const local = await evaluateAllAiLocal(ctx);
    const gov = await evaluateAllAiGov(ctx);
    const results = [...local, ...gov].sort((a, b) =>
      a.requirementId.localeCompare(b.requirementId),
    );

    const ids = new Set(results.map((r) => r.requirementId));
    for (const id of TARGET_REQUIREMENTS) {
      if (!ids.has(id)) {
        results.push({
          requirementId: id,
          title: id,
          validationState: 'IMPLEMENTED_VALIDATION_OPEN',
          runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
          metrics: { missingEvaluator: true },
          negativeCases: [],
          evidencePaths: [],
          notes: 'Evaluator missing — wave003 harness gap',
        });
      }
    }

    if (opts.runCrossCheck !== false) {
      crossCheckRequirementProof(ctx.repoRoot, ctx.scratchRoot, results);
    }

    writeEvaluationBaseline(ctx, results, ACCEPTED_MAIN_SHA);
    const rescored006 = rescoreAiGov006FromBaseline(ctx);
    const idx006 = results.findIndex((r) => r.requirementId === 'AI-GOV-006');
    if (idx006 >= 0) {
      rescored006.crossCheckRequirementProof = results[idx006].crossCheckRequirementProof;
      results[idx006] = rescored006;
    }
    writeEvaluationBaseline(ctx, results, ACCEPTED_MAIN_SHA);

    let independentDigitalReproduction: Wave003Report['independentDigitalReproduction'] = 'FAIL';
    let independentReproduction: Wave003Report['independentReproduction'];
    const isChild = Boolean(process.env.GUNNCHAI_WAVE003_REPRODUCTION);
    if (opts.runReproduction !== false && !isChild) {
      independentReproduction = runIndependentReproduction(cwd, results);
      independentDigitalReproduction = independentReproduction.result;
    } else if (isChild) {
      independentDigitalReproduction = 'PARTIAL';
    }

    const report: Wave003Report = {
      schema: 'gunnchai.engineering_wave003.v1',
      wave: '003',
      generatedAt: new Date().toISOString(),
      branch: WAVE003_BRANCH,
      acceptedMainSha: ACCEPTED_MAIN_SHA,
      doctrine: {
        independentEvaluator: true,
        validationImportsRequirementProof: VALIDATION_IMPORTS_REQUIREMENT_PROOF,
        requirementProofRole: 'cross-check-only',
      },
      targetRequirements: [...TARGET_REQUIREMENTS],
      results,
      summary: summarize(results),
      claimBoundaries: { ...CLAIM_BOUNDARIES },
      independentDigitalReproduction,
      allTargetEvaluated: TARGET_REQUIREMENTS.every((id) => ids.has(id)),
      releaseComplete: releaseComplete({
        results,
        independentDigitalReproduction,
      }),
      independentReproduction,
    };

    fs.writeFileSync(
      path.join(ctx.resultsDir, 'WAVE003_EVAL.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );

    if (opts.writeEvidence !== false) {
      writeWave003Evidence(ctx, report);
    }

    return report;
  } finally {
    cleanupWave003Context(ctx);
  }
}

export function exitCodeForReport(report: Wave003Report): number {
  if (report.summary.implementedValidationOpen > 0) return 1;
  if (report.summary.reclassify > 0) return 1;
  if (report.independentDigitalReproduction !== 'PASS') return 1;
  if (!report.releaseComplete) return 1;
  return 0;
}
