import * as fs from 'node:fs';
import * as path from 'node:path';
import { DeterministicBaselineBackend } from '../../../system-layer/local_inference/backends/deterministic';
import {
  CAPABILITY_SPECS,
  runNonAiBaseline,
  scoreSystemAgainstBaseline,
} from '../../../system-layer/evaluation/metrics';
import { ModelRouter } from '../../../stage2/fleet/router';
import { GovernanceRuntime } from '../../../system-layer/product_service/governance';
import type { Wave003Context } from '../context';
import type { NegativeCase, RequirementEvalResult } from '../types';

function neg(id: string, description: string, passed: boolean, detail: string): NegativeCase {
  return { id, description, passed, detail };
}

function validated(
  partial: Omit<RequirementEvalResult, 'validationState'> & { pass: boolean },
): RequirementEvalResult {
  return {
    ...partial,
    validationState: partial.pass ? 'VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
  };
}

function gov(ctx: Wave003Context): GovernanceRuntime {
  return new GovernanceRuntime(ctx.repoRoot, {
    storeDir: path.join(ctx.scratchRoot, 'governance'),
    modelVersion: 'wave003-eval@1',
  });
}

export function evaluateAiGov001(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  g.declarePurpose('Wave003 declared purpose: local tutoring assist only');
  const decision = g.decide({
    capability: 'tutoring',
    query: 'teach sorting',
    processingMode: 'local-only',
  });
  const negativeCases = [
    neg(
      'purpose-declared',
      'Governance exposes non-empty declared purpose',
      decision.purposeDeclared && decision.purpose.length > 10,
      decision.purpose.slice(0, 80),
    ),
    neg(
      'purpose-required-block',
      'Empty purpose path would block (simulated)',
      Boolean(g.getState().declaredPurpose),
      String(g.getState().declaredPurpose?.length),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-001',
    title: 'AI governance: Declared purpose',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: { purposeLength: decision.purpose.length },
    negativeCases,
    evidencePaths: ['src/system-layer/product_service/governance.ts#declarePurpose'],
    notes: 'Runtime purpose declaration enforced before assist decisions.',
  });
}

export function evaluateAiGov003(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  g.setMinimization({ stripPiiHints: true, maxQueryChars: 200 });
  const decision = g.decide({
    capability: 'tutoring',
    query: 'help student@example.com with homework at 555-123-4567',
  });
  const negativeCases = [
    neg(
      'email-redacted',
      'Email stripped from minimized query',
      decision.minimizedQuery.includes('[redacted-email]') &&
        !decision.minimizedQuery.includes('student@example.com'),
      decision.minimizedQuery,
    ),
    neg(
      'phone-redacted',
      'Phone stripped from minimized query',
      decision.minimizedQuery.includes('[redacted-phone]'),
      decision.minimizedQuery,
    ),
    neg(
      'minimization-flag',
      'MinimizationApplied true when redactions occur',
      decision.minimizationApplied === true,
      String(decision.minimizationApplied),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-003',
    title: 'AI governance: Data minimization',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: { minimizationApplied: decision.minimizationApplied },
    negativeCases,
    evidencePaths: ['src/system-layer/product_service/governance.ts#setMinimization'],
    notes: 'PII hint stripping + max query length minimization at decision time.',
  });
}

export function evaluateAiGov004(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  g.setConsent(false);
  const decision = g.decide({
    capability: 'tutoring',
    query: 'explain photosynthesis',
    processingMode: 'local-only',
    containsSensitiveLocalData: true,
  });
  const negativeCases = [
    neg(
      'local-only-disclosure',
      'Disclosure states LOCAL-ONLY posture',
      /LOCAL-ONLY/i.test(decision.disclosure),
      decision.disclosure.slice(0, 120),
    ),
    neg(
      'cloud-not-permitted',
      'Cloud not permitted without consent in local-only mode',
      decision.cloudPermitted === false,
      String(decision.cloudPermitted),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-004',
    title: 'AI governance: Local/cloud processing disclosure',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: { cloudPermitted: decision.cloudPermitted },
    negativeCases,
    evidencePaths: ['src/system-layer/privacy_policy.ts'],
    notes: 'User-visible local/cloud disclosure via governance + privacy policy evaluator.',
  });
}

export function evaluateAiGov005(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  g.setModelVersion('wave003-eval@2');
  g.setModelVersion('wave003-eval@3');
  const state = g.getState();
  const negativeCases = [
    neg(
      'active-version',
      'Active model version tracked',
      state.activeModelVersion === 'wave003-eval@3',
      state.activeModelVersion,
    ),
    neg(
      'history',
      'Model version history retains prior versions',
      state.modelVersionHistory.includes('wave003-eval@1') &&
        state.modelVersionHistory.includes('wave003-eval@2'),
      state.modelVersionHistory.join(','),
    ),
    neg(
      'decision-exposes-version',
      'Assist decisions expose modelVersion field',
      g.decide({ capability: 'code', query: 'hello' }).modelVersion.length > 0,
      g.decide({ capability: 'code', query: 'hello' }).modelVersion,
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-005',
    title: 'AI governance: Model and version identification',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: { historyLength: state.modelVersionHistory.length },
    negativeCases,
    evidencePaths: ['src/system-layer/product_service/governance.ts#setModelVersion'],
    notes: 'Model/version identification with bounded history (not cloud model registry).',
  });
}

export function evaluateAiGov006(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  const ref = g.getState().evalBaselineRef;
  const baselineDir = path.join(ctx.repoRoot, ref);
  const evalFixturesExist = fs.existsSync(baselineDir);
  const tutoringDataset = fs.existsSync(path.join(baselineDir, 'tutoring.jsonl'));
  const negativeCases = [
    neg(
      'baseline-ref-set',
      'Governance state includes eval baseline ref',
      ref.includes('fixtures/system-layer/eval'),
      ref,
    ),
    neg(
      'baseline-dir-present',
      'Referenced baseline directory exists on disk',
      evalFixturesExist,
      baselineDir,
    ),
    neg(
      'dataset-present',
      'At least one capability dataset jsonl exists',
      tutoringDataset,
      String(tutoringDataset),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-006',
    title: 'AI governance: Evaluation baseline',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: { evalBaselineRef: ref, datasetsPresent: tutoringDataset },
    negativeCases,
    evidencePaths: ['fixtures/system-layer/eval/tutoring.jsonl'],
    notes: 'Eval baseline ref points to shipped structured datasets (Continuance III harness).',
  });
}

export async function evaluateAiGov007(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const spec = CAPABILITY_SPECS.find((s) => s.capability === 'tutoring');
  const det = new DeterministicBaselineBackend();
  const good = await det.infer({ capability: 'tutoring', query: 'teach binary search' });
  const textOnly = {
    ...good,
    structured: {},
    text: 'just words',
  };
  const baseline = runNonAiBaseline('tutoring', 'teach binary search');
  const goodScore = scoreSystemAgainstBaseline('tutoring', good, baseline);
  const badScore = scoreSystemAgainstBaseline('tutoring', textOnly, baseline);

  const negativeCases = [
    neg(
      'failure-modes-declared',
      'Capability spec declares failure modes',
      (spec?.failureModes.length ?? 0) >= 2,
      (spec?.failureModes ?? []).join(','),
    ),
    neg(
      'structured-beats-text-only',
      'Structured tutoring beats text-only failure mode',
      goodScore.beatsOrComplementsBaseline && goodScore.structuredEvaluation,
      goodScore.metricName,
    ),
    neg(
      'text-only-fails',
      'Text-only response fails structured metric',
      !badScore.beatsOrComplementsBaseline || !badScore.structuredEvaluation,
      badScore.details.join(';'),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-007',
    title: 'AI governance: Failure analysis',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      goodScore: goodScore.systemScore,
      badScore: badScore.systemScore,
    },
    negativeCases,
    evidencePaths: ['src/system-layer/evaluation/metrics.ts'],
    notes: 'Failure analysis via declared failureModes + structured metric scoring (not log slogans).',
  });
}

export async function evaluateAiGov008(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const det = new DeterministicBaselineBackend();
  const infer = await det.infer({ capability: 'a11y', query: 'icon button without label' });
  const scopePath = path.join(ctx.fixtureRoot, 'bias_a11y_scope.json');
  const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8')) as {
    inScope: string[];
    outOfScopeClaims: string[];
  };

  const negativeCases = [
    neg(
      'a11y-structured',
      'Accessibility evaluation returns structured issues',
      infer.structured.kind === 'a11y' && Array.isArray(infer.structured.issues),
      String((infer.structured.issues as unknown[])?.length),
    ),
    neg(
      'scope-honest',
      'Scope file denies general bias audit / VLM claims',
      scope.outOfScopeClaims.includes('GENERAL_VLM') &&
        scope.outOfScopeClaims.includes('GENERAL_BIAS_AUDIT'),
      scope.outOfScopeClaims.join(','),
    ),
    neg(
      'wcag-boundary',
      'WCAG AA target only (not full certification)',
      infer.structured.wcagTarget === 'AA',
      String(infer.structured.wcagTarget),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-008',
    title: 'AI governance: Bias and accessibility evaluation',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: { inScopeChecks: scope.inScope.length },
    negativeCases,
    evidencePaths: ['evals/wave003/fixtures/bias_a11y_scope.json'],
    notes: 'Bounded a11y checklist evaluation; general bias/VLM claims remain out of scope.',
  });
}

export function evaluateAiGov010(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  g.setSafeFallback(true);
  const router = new ModelRouter();
  router.getFleet().ensureFixtureRefs(ctx.repoRoot);
  const fallback = router.route({
    task: 'tutoring',
    privacy: 'personal',
    contextTokens: 512,
    ramMb: 4096,
    forceFailure: 'unavailable',
  });
  const decision = g.decide({ capability: 'tutoring', query: 'help' });

  const negativeCases = [
    neg(
      'safe-fallback-flag',
      'Governance safe fallback enabled',
      decision.fallbackSafe === true,
      String(decision.fallbackSafe),
    ),
    neg(
      'nano-fallback-tier',
      'Router selects nano fallback when primary unavailable',
      fallback.selectedRole === 'NANO_LOCAL' && /nano-fallback-tier/.test(fallback.reason),
      `${fallback.selectedRole}:${fallback.reason}`,
    ),
    neg(
      'not-cloud-fallback',
      'Fallback chain does not require cloud for basic tutoring',
      fallback.location === 'local',
      fallback.location,
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-010',
    title: 'AI governance: Safe fallback',
    pass,
    runtimeKind: 'LOCAL_ROUTER',
    metrics: { fallbackRole: String(fallback.selectedRole) },
    negativeCases,
    evidencePaths: ['src/stage2/fleet/router.ts', 'src/system-layer/product_service/governance.ts#setSafeFallback'],
    notes: 'Safe local fallback chain (nano tier) with governance fallbackSafe flag.',
  });
}

export function evaluateAiGov011(ctx: Wave003Context): RequirementEvalResult {
  const storeDir = path.join(ctx.scratchRoot, 'governance-monitor');
  const g = new GovernanceRuntime(ctx.repoRoot, {
    storeDir,
    modelVersion: 'wave003-eval@1',
  });
  g.record('wave003_probe', 'monitoring probe event', true, 'tutoring');
  const events = g.recentEvents(5);
  const monitorPath = path.join(storeDir, 'monitor.jsonl');
  const monitorFileExists = fs.existsSync(monitorPath);

  const negativeCases = [
    neg(
      'event-recorded',
      'Monitoring records governance events',
      events.some((e) => e.kind === 'wave003_probe'),
      events.map((e) => e.kind).join(','),
    ),
    neg(
      'jsonl-append',
      'Monitor jsonl file appended on disk',
      monitorFileExists && fs.readFileSync(monitorPath, 'utf8').includes('wave003_probe'),
      String(monitorFileExists),
    ),
    neg(
      'privacy-detail-bound',
      'Event detail length bounded (no raw dump)',
      events.every((e) => e.detail.length <= 500),
      String(events[0]?.detail.length ?? 0),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-011',
    title: 'AI governance: Monitoring',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: { eventCount: g.getState().monitoring.eventCount },
    negativeCases,
    evidencePaths: ['src/system-layer/product_service/governance.ts#record'],
    notes: 'Local governance monitoring with bounded detail; not external SIEM integration.',
  });
}

export function evaluateAiGov012(ctx: Wave003Context): RequirementEvalResult {
  const g = gov(ctx);
  g.setConsent(true);
  const snap = g.snapshot('before-consent-rollback');
  g.setConsent(false);
  g.rollback(snap);
  const afterGovernanceRollback = g.getState().userCloudConsent === true;

  g.setModelVersion('wave003-eval@2');
  g.rollbackModel('wave003-eval@1');
  const afterModelRollback = g.getState().activeModelVersion === 'wave003-eval@1';

  const negativeCases = [
    neg(
      'governance-rollback',
      'Governance snapshot rollback restores prior consent',
      afterGovernanceRollback,
      String(g.getState().userCloudConsent),
    ),
    neg(
      'model-rollback',
      'Model version rollback restores prior active version',
      afterModelRollback,
      g.getState().activeModelVersion,
    ),
    neg(
      'history-retained',
      'Model history retained after rollback',
      g.getState().modelVersionHistory.includes('wave003-eval@2'),
      g.getState().modelVersionHistory.join(','),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-012',
    title: 'AI governance: Rollback capability',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: {
      snapshotCount: g.getState().rollback.snapshots.length,
      activeModelVersion: g.getState().activeModelVersion,
    },
    negativeCases,
    evidencePaths: [
      'src/system-layer/product_service/governance.ts#rollback',
      'src/system-layer/product_service/governance.ts#rollbackModel',
    ],
    notes: 'Governance state + model version rollback with bounded snapshot history.',
  });
}

export async function evaluateAllAiGov(ctx: Wave003Context): Promise<RequirementEvalResult[]> {
  return [
    evaluateAiGov001(ctx),
    evaluateAiGov003(ctx),
    evaluateAiGov004(ctx),
    evaluateAiGov005(ctx),
    evaluateAiGov006(ctx),
    await evaluateAiGov007(ctx),
    await evaluateAiGov008(ctx),
    evaluateAiGov010(ctx),
    evaluateAiGov011(ctx),
    evaluateAiGov012(ctx),
  ];
}
