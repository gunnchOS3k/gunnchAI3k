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
import {
  PRIVACY_SENTINELS,
  REQUIRED_MONITOR_EVENT_TYPES,
  WAVE003_PURPOSE,
} from '../constants';
import { isBaselineComplete, readEvaluationBaseline } from '../baseline';
import type { Wave003Context } from '../context';
import type { NegativeCase, RequirementEvalResult } from '../types';

function neg(id: string, description: string, passed: boolean, detail: string): NegativeCase {
  return { id, description, passed, detail };
}

function validated(
  partial: Omit<RequirementEvalResult, 'validationState'> & { pass: boolean },
): RequirementEvalResult {
  const { pass, ...rest } = partial;
  return {
    ...rest,
    validationState: pass ? 'VALIDATED' : 'IMPLEMENTED_VALIDATION_OPEN',
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
  g.declarePurpose({ ...WAVE003_PURPOSE, intendedUsers: [...WAVE003_PURPOSE.intendedUsers], intendedUses: [...WAVE003_PURPOSE.intendedUses], outOfScope: [...WAVE003_PURPOSE.outOfScope], limitations: [...WAVE003_PURPOSE.limitations] });
  const rec = g.getState().declaredPurposeRecord;
  const decision = g.decide({
    capability: 'tutoring',
    query: 'teach sorting',
    processingMode: 'local-only',
  });
  const structureComplete = Boolean(
    rec &&
      rec.purpose.length > 20 &&
      rec.intendedUsers.length > 0 &&
      rec.intendedUses.length > 0 &&
      rec.outOfScope.length > 0 &&
      rec.limitations.length > 0,
  );
  const negativeCases = [
    neg(
      'purpose-declared',
      'Governance exposes non-empty declared purpose',
      decision.purposeDeclared && decision.purpose.length > 10,
      decision.purpose.slice(0, 80),
    ),
    neg(
      'purpose-structure',
      'Purpose record includes users, uses, out-of-scope, limitations',
      structureComplete,
      JSON.stringify(rec),
    ),
    neg(
      'purpose-required-block',
      'Declared purpose persisted on governance state',
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
    metrics: {
      purposeLength: decision.purpose.length,
      purposeStructureComplete: structureComplete,
    },
    negativeCases,
    evidencePaths: ['src/system-layer/product_service/governance.ts#declarePurpose'],
    notes: 'Purpose structure validated: intended users/uses/out-of-scope/limitations.',
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
  return {
    requirementId: 'AI-GOV-006',
    title: 'AI governance: Evaluation baseline',
    validationState: 'IMPLEMENTED_VALIDATION_OPEN',
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: {
      evalBaselineRef: ref,
      datasetsPresent: tutoringDataset,
      baselineComplete: false,
    },
    negativeCases: [
      neg(
        'baseline-dir-present',
        'Referenced baseline directory exists on disk',
        evalFixturesExist && tutoringDataset,
        baselineDir,
      ),
      neg(
        'versioned-artifact',
        'Versioned EVALUATION_BASELINE.json completeness is rescored after write',
        false,
        'pending-rescore',
      ),
    ],
    evidencePaths: ['evidence/engineering_wave003/EVALUATION_BASELINE.json'],
    notes: 'Placeholder; rescoreAiGov006FromBaseline validates the versioned artifact.',
  };
}

export function rescoreAiGov006FromBaseline(ctx: Wave003Context): RequirementEvalResult {
  const artifact = readEvaluationBaseline(ctx);
  const complete = Boolean(artifact && isBaselineComplete(artifact));
  const negativeCases = [
    neg(
      'schema',
      'Baseline schema is versioned evaluation_baseline.v1',
      artifact?.schema === 'gunnchai.engineering_wave003.evaluation_baseline.v1',
      String(artifact?.schema),
    ),
    neg(
      'commits-env-hashes',
      'Baseline includes commits, environment, fixture hashes',
      Boolean(
        artifact?.commits.head &&
          artifact.environment.node &&
          Object.keys(artifact.fixtureHashes).length >= 3,
      ),
      JSON.stringify({
        head: artifact?.commits.head,
        node: artifact?.environment.node,
        fixtureCount: Object.keys(artifact?.fixtureHashes ?? {}).length,
      }),
    ),
    neg(
      'per-req-thresholds',
      'Every target requirement has metrics, thresholds, current_result, validation_state',
      complete,
      String(complete),
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-006',
    title: 'AI governance: Evaluation baseline',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: {
      evalBaselineRef: artifact?.commits.head ?? '',
      datasetsPresent: true,
      baselineComplete: complete,
    },
    negativeCases,
    evidencePaths: ['evidence/engineering_wave003/EVALUATION_BASELINE.json'],
    notes: 'Versioned EVALUATION_BASELINE.json completeness + meaningful per-req thresholds.',
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
  const scopePath = path.join(ctx.fixtureRoot, 'bias_a11y_scope.json');
  const scope = JSON.parse(fs.readFileSync(scopePath, 'utf8')) as {
    inScope: string[];
    outOfScopeClaims: string[];
  };

  const dimensions = [
    {
      id: 'language',
      a: await det.infer({
        capability: 'a11y',
        query: 'icon button without label',
        deviceProfileId: 'handheld_hybrid',
      }),
      b: await det.infer({
        capability: 'translation',
        query: 'en to es: hello',
      }),
    },
    {
      id: 'reading-level',
      a: await det.infer({
        capability: 'a11y',
        query: 'icon button without label',
        readingLevel: 'simple',
      }),
      b: await det.infer({
        capability: 'a11y',
        query: 'icon button without accessible name in a dense settings panel',
        readingLevel: 'standard',
      }),
    },
    {
      id: 'input-length',
      a: await det.infer({ capability: 'a11y', query: 'icon button without label' }),
      b: await det.infer({
        capability: 'a11y',
        query: `${'icon button without label. '.repeat(40)}`,
      }),
    },
    {
      id: 'a11y-mode',
      a: await det.infer({
        capability: 'a11y',
        query: 'labeled primary button',
        a11yMode: 'labeled',
      }),
      b: await det.infer({
        capability: 'a11y',
        query: 'icon button without label',
        a11yMode: 'missing_label',
      }),
    },
    {
      id: 'device-profile',
      a: await det.infer({
        capability: 'a11y',
        query: 'icon button without label',
        deviceProfileId: 'handheld_hybrid',
      }),
      b: await det.infer({
        capability: 'a11y',
        query: 'icon button without label',
        deviceProfileId: 'desktop_control',
      }),
    },
  ];

  const issues = (r: { structured: Record<string, unknown> }): string[] =>
    ((r.structured.issues as Array<{ id: string }>) ?? []).map((i) => i.id);

  const labelDiff =
    issues(dimensions.find((d) => d.id === 'a11y-mode')!.a).includes('labels') === false &&
    issues(dimensions.find((d) => d.id === 'a11y-mode')!.b).includes('labels') === true;

  const bothProfilesFlagLabels =
    issues(dimensions.find((d) => d.id === 'device-profile')!.a).includes('labels') &&
    issues(dimensions.find((d) => d.id === 'device-profile')!.b).includes('labels');

  const readingBothA11y =
    dimensions.find((d) => d.id === 'reading-level')!.a.structured.kind === 'a11y' &&
    dimensions.find((d) => d.id === 'reading-level')!.b.structured.kind === 'a11y';

  const inputLengthStillA11y =
    dimensions.find((d) => d.id === 'input-length')!.b.structured.kind === 'a11y';

  const languageProcessed =
    dimensions.find((d) => d.id === 'language')!.b.structured.kind === 'translation';

  const executed = true;
  const passDifferential =
    executed && labelDiff && bothProfilesFlagLabels && readingBothA11y && inputLengthStillA11y && languageProcessed;

  const evaluation = {
    schema: 'gunnchai.engineering_wave003.bias_accessibility_evaluation.v1',
    GENERAL_BIAS_AUDIT: false,
    HUMAN_ACCESSIBILITY_VALIDATED: false,
    dimensionsExecuted: dimensions.map((d) => d.id),
    results: {
      languageProcessed,
      readingLevelA11yPreserved: readingBothA11y,
      inputLengthA11yPreserved: inputLengthStillA11y,
      missingLabelDifferential: labelDiff,
      deviceProfileA11yPreserved: bothProfilesFlagLabels,
    },
    executed,
    pass: passDifferential,
  };
  fs.writeFileSync(
    path.join(ctx.evidenceDir, 'BIAS_ACCESSIBILITY_EVALUATION.json'),
    `${JSON.stringify(evaluation, null, 2)}\n`,
  );

  const negativeCases = [
    neg(
      'differential-executed',
      'Bounded differential eval executed on supported dimensions',
      executed && evaluation.dimensionsExecuted.length >= 5,
      evaluation.dimensionsExecuted.join(','),
    ),
    neg(
      'missing-label-delta',
      'Labeled vs unlabeled control changes labels issue',
      labelDiff,
      `labelDiff=${labelDiff}`,
    ),
    neg(
      'scope-honest',
      'Scope file denies general bias audit / VLM claims',
      scope.outOfScopeClaims.includes('GENERAL_VLM') &&
        scope.outOfScopeClaims.includes('GENERAL_BIAS_AUDIT'),
      scope.outOfScopeClaims.join(','),
    ),
  ];
  const pass = passDifferential && negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-008',
    title: 'AI governance: Bias and accessibility evaluation',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      inScopeChecks: scope.inScope.length,
      differentialExecuted: executed,
      generalBiasAudit: false,
      dimensions: evaluation.dimensionsExecuted.length,
    },
    negativeCases,
    evidencePaths: [
      'evals/wave003/fixtures/bias_a11y_scope.json',
      'evidence/engineering_wave003/BIAS_ACCESSIBILITY_EVALUATION.json',
    ],
    notes:
      'Bounded differential a11y/language/input/device-profile eval. GENERAL_BIAS_AUDIT remains false.',
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
  const t0 = Date.now();
  g.record(
    'invocation',
    `assist invocation with ${PRIVACY_SENTINELS.secret} for ${PRIVACY_SENTINELS.email} ${PRIVACY_SENTINELS.phone}`,
    true,
    'tutoring',
    Date.now() - t0,
  );
  g.record('runtime_identity', 'hostClass=CURSOR_BACKGROUND_AGENT runtime=LOCAL_GOVERNANCE_RUNTIME', true, undefined, 1);
  g.record('local_cloud_route', 'route=local-only cloudPermitted=false', true, 'tutoring', 1);
  g.setSafeFallback(true);
  g.record('fallback', 'safeFallbackEnabled=true nano-tier', true, 'tutoring', 1);
  g.record('injected_error', 'injected backend failure handled; no secret echo', false, 'tutoring', 2);
  g.record('eval_outcome', 'wave003 eval outcome recorded locally', true, 'tutoring', 3);
  const snap = g.snapshot('pre-monitor-rollback');
  g.setConsent(true);
  g.rollback(snap);
  const events = g.recentEvents(50);
  const monitorPath = path.join(storeDir, 'monitor.jsonl');
  const raw = fs.existsSync(monitorPath) ? fs.readFileSync(monitorPath, 'utf8') : '';
  const observed = [...new Set(events.map((e) => e.kind))];
  const missing = REQUIRED_MONITOR_EVENT_TYPES.filter((k) => !observed.includes(k));
  const leaks = [PRIVACY_SENTINELS.secret, PRIVACY_SENTINELS.email, PRIVACY_SENTINELS.phone].filter(
    (s) => raw.includes(s) || events.some((e) => e.detail.includes(s)),
  );
  const redactions =
    events.some((e) => e.detail.includes('[redacted-secret]')) &&
    events.some((e) => e.detail.includes('[redacted-email]')) &&
    events.some((e) => e.detail.includes('[redacted-phone]'));
  const latencyPresent = events.filter((e) => typeof e.latencyMs === 'number').length === events.length;

  const privacyArtifact = {
    schema: 'gunnchai.engineering_wave003.monitoring_privacy.v1',
    required_event_types: [...REQUIRED_MONITOR_EVENT_TYPES],
    observed,
    missing,
    leaks,
    redactions: redactions,
    latency_field_present: latencyPresent,
  };
  fs.writeFileSync(
    path.join(ctx.evidenceDir, 'MONITORING_PRIVACY_RESULT.json'),
    `${JSON.stringify(privacyArtifact, null, 2)}\n`,
  );

  const negativeCases = [
    neg(
      'required-events',
      'Required monitoring event types observed',
      missing.length === 0,
      missing.join(',') || 'none-missing',
    ),
    neg(
      'no-sentinel-leaks',
      'Privacy sentinels do not appear in monitor jsonl or event details',
      leaks.length === 0,
      leaks.join(',') || 'no-leaks',
    ),
    neg(
      'redactions-and-latency',
      'Redaction tokens present and latencyMs on events',
      redactions && latencyPresent,
      `redactions=${redactions} latency=${latencyPresent}`,
    ),
  ];
  const pass = negativeCases.every((n) => n.passed);
  return validated({
    requirementId: 'AI-GOV-011',
    title: 'AI governance: Monitoring',
    pass,
    runtimeKind: 'LOCAL_GOVERNANCE_RUNTIME',
    metrics: {
      eventCount: g.getState().monitoring.eventCount,
      privacyLeaks: leaks.length,
      missingEventTypes: missing.length,
      latencyFieldPresent: latencyPresent,
    },
    negativeCases,
    evidencePaths: [
      'src/system-layer/product_service/governance.ts#record',
      'evidence/engineering_wave003/MONITORING_PRIVACY_RESULT.json',
    ],
    notes: 'Monitoring covers invocation/identity/route/fallback/error/eval/rollback with privacy sentinels redacted.',
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
