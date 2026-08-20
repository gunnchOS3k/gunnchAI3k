import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Wave003Context } from './context';
import type { Wave003Report } from './types';

function writeJson(dir: string, name: string, payload: unknown): void {
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

export function writeWave003Evidence(ctx: Wave003Context, report: Wave003Report): void {
  const dir = ctx.evidenceDir;
  fs.mkdirSync(dir, { recursive: true });

  writeJson(dir, 'WAVE003_RESULT.json', {
    schema: report.schema,
    wave: report.wave,
    generatedAt: report.generatedAt,
    branch: report.branch,
    acceptedMainSha: report.acceptedMainSha,
    historicalPr: 44,
    summary: report.summary,
    independentDigitalReproduction: report.independentDigitalReproduction,
    releaseComplete: report.releaseComplete,
    claimBoundaries: report.claimBoundaries,
    doctrine: report.doctrine,
  });

  writeJson(
    dir,
    'REQUIREMENT_RESULTS.json',
    report.results.map((r) => ({
      requirementId: r.requirementId,
      title: r.title,
      validationState: r.validationState,
      runtimeKind: r.runtimeKind,
      metrics: r.metrics,
      negativeCases: r.negativeCases,
      notes: r.notes,
      crossCheckRequirementProof: r.crossCheckRequirementProof,
    })),
  );

  writeJson(dir, 'RUNTIME_IDENTITY.json', {
    hostClass: 'CURSOR_BACKGROUND_AGENT',
    lowResourceHost: true,
    backends: ['deterministic', 'local-rag', 'governance-runtime', 'model-router'],
    localNeuralOptional: 'llama.cpp nano fallback only; not required for wave003 PASS',
    requirementProofCrossCheckOnly: true,
  });

  const failures = report.results.flatMap((r) =>
    r.negativeCases
      .filter((n) => !n.passed)
      .map((n) => ({
        requirementId: r.requirementId,
        negativeCaseId: n.id,
        detail: n.detail,
      })),
  );
  writeJson(dir, 'FAILURE_ANALYSIS.json', {
    failureCaseCount: failures.length,
    failures,
    capabilityFailureModes: 'src/system-layer/evaluation/metrics.ts',
  });

  const a11y = report.results.find((r) => r.requirementId === 'AI-GOV-008');
  writeJson(dir, 'BIAS_ACCESSIBILITY_SCOPE.json', {
    inScope: ['structured_a11y_checklist', 'wcag_aa_target_declaration', 'bounded_differential_eval'],
    outOfScope: ['GENERAL_VLM', 'GENERAL_BIAS_AUDIT', 'HUMAN_E6'],
    aiGov008State: a11y?.validationState ?? 'UNKNOWN',
    metrics: a11y?.metrics ?? {},
    GENERAL_BIAS_AUDIT: false,
  });

  const offline = report.results.find((r) => r.requirementId === 'AI-LOCAL-011');
  writeJson(dir, 'OFFLINE_NETWORK_DENIAL_RESULT.json', {
    requirementId: 'AI-LOCAL-011',
    validationState: offline?.validationState,
    metrics: offline?.metrics,
    cloudSolePathClaim: false,
  });

  if (report.independentReproduction) {
    writeJson(dir, 'INDEPENDENT_REPRODUCTION.json', report.independentReproduction);
  }

  const rollback = report.results.find((r) => r.requirementId === 'AI-GOV-012');
  writeJson(dir, 'ROLLBACK_RESULT.json', {
    requirementId: 'AI-GOV-012',
    validationState: rollback?.validationState,
    metrics: rollback?.metrics ?? {},
  });
}
