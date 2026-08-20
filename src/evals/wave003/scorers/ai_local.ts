import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalFirstRuntime } from '../../../local-runtime/runtime';
import { LocalOnlyNetworkGuard } from '../../../local-runtime/network';
import { DeterministicBaselineBackend } from '../../../system-layer/local_inference/backends/deterministic';
import { LocalRagEngine } from '../../../system-layer/product_service/rag_engine';
import { GunnchAIProductService } from '../../../system-layer/product_service/service';
import { ModelRouter } from '../../../stage2/fleet/router';
import { runCodingAgentE2E } from '../../../phase_xiv/computer_use/coding_agent';
import type { Wave003Context } from '../context';
import type { NegativeCase, RequirementEvalResult } from './types';

const WAIKE_MARKER = 'WAIKE_FIDELITY_MARKER_7GC_ORANGE_DOCK';

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

export async function evaluateAiLocal001(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const det = new DeterministicBaselineBackend();
  const guard = new LocalOnlyNetworkGuard('local-only');
  const verification = guard.verify();
  let cloudRejected = false;
  try {
    guard.assertCloudCallAllowed('https://api.openai.com/v1/chat/completions');
  } catch {
    cloudRejected = true;
  }

  const runtime = new LocalFirstRuntime({
    mode: 'local-only',
    fixtureRoot: path.join(ctx.repoRoot, 'fixtures', 'local-runtime'),
    auditDir: path.join(ctx.scratchRoot, 'audit-tutor'),
  });
  const live = await runtime.handle({
    id: 'w003-tutor-1',
    capability: 'tutoring',
    query: 'teach binary search from offline pack',
  });
  const infer = await det.infer({ capability: 'tutoring', query: 'teach binary search' });
  const tutoringDoc = fs.readFileSync(
    path.join(ctx.repoRoot, 'fixtures', 'local-runtime', 'documents', 'tutoring-basics.md'),
    'utf8',
  );
  const waikeFixture = path.join(
    ctx.repoRoot,
    'fixtures',
    'waike',
    'public',
    'curriculum',
    'digital_rc',
    'GENERAL_IT',
    'course.json',
  );
  const waikePresent = fs.existsSync(waikeFixture);

  const negativeCases = [
    neg(
      'network-denied',
      'Cloud endpoints blocked in local-only mode',
      verification.result === 'local-only-enforced' && cloudRejected,
      `verification=${verification.result} cloudRejected=${cloudRejected}`,
    ),
    neg(
      'no-cloud-tutor-response',
      'Tutoring response must not claim cloud upload',
      !/upload to cloud|openai\.com/i.test(live.text ?? ''),
      live.text?.slice(0, 120) ?? '',
    ),
    neg(
      'structured-rubric',
      'Tutoring must expose steps + check (not text-only)',
      infer.structured.kind === 'tutoring' &&
        Array.isArray(infer.structured.steps) &&
        Boolean(infer.structured.checkQuestion),
      JSON.stringify({
        kind: infer.structured.kind,
        steps: (infer.structured.steps as unknown[])?.length,
      }),
    ),
  ];

  const pass =
    negativeCases.every((n) => n.passed) &&
    live.ok === true &&
    tutoringDoc.includes('Binary Search') &&
    waikePresent;

  return validated({
    requirementId: 'AI-LOCAL-001',
    title: 'Local-first AI: Offline tutoring packs',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      offlinePackPresent: tutoringDoc.includes('offline-tutoring-v1'),
      waikeFixturePresent: waikePresent,
      structuredSteps: (infer.structured.steps as unknown[])?.length ?? 0,
      networkDenied: cloudRejected,
    },
    negativeCases,
    evidencePaths: [
      'fixtures/local-runtime/documents/tutoring-basics.md',
      'fixtures/waike/public/curriculum/digital_rc/GENERAL_IT/course.json',
    ],
    notes:
      'Deterministic offline tutoring rubric with local-only network guard. WAIKE fixture present for curriculum scope; not a neural tutor quality claim.',
  });
}

export async function evaluateAiLocal002(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const det = new DeterministicBaselineBackend();
  const infer = await det.infer({
    capability: 'code',
    query: 'typescript early return guard for fixture repo',
  });
  const coding = await runCodingAgentE2E(ctx.repoRoot);

  const negativeCases = [
    neg(
      'typed-early-return',
      'Code assist exposes typed early-return guard',
      infer.structured.kind === 'code' &&
        infer.structured.language === 'typescript' &&
        /early.?return/i.test(String(infer.text)),
      String(infer.structured.pattern),
    ),
    neg(
      'coding-agent-edit',
      'Fixture-repo coding agent edits file before merge gate',
      coding.ok && coding.mergeApprovalPending,
      coding.status,
    ),
    neg(
      'no-merge-without-approval',
      'Merge remains blocked pending approval',
      coding.mergeApprovalPending === true,
      String(coding.mergeApprovalPending),
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-002',
    title: 'Local-first AI: Local code assistance',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      hasCodeFence: /```typescript/.test(String(infer.structured.code ?? '')),
      codingAgentOk: coding.ok,
    },
    negativeCases,
    evidencePaths: [
      'src/system-layer/local_inference/backends/deterministic.ts',
      'src/phase_xiv/computer_use/coding_agent.ts',
      'evals/wave003/fixtures/code_fixture_repo/README.md',
    ],
    notes: 'Structured local code assist plus sandboxed coding-agent E2E on ephemeral fixture repo.',
  });
}

export async function evaluateAiLocal003(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const statePath = path.join(ctx.fixtureRoot, 'device_state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
    profileId: string;
    storageHealth: string;
    batteryPct: number;
  };
  const det = new DeterministicBaselineBackend();
  const infer = await det.infer({
    capability: 'device_help',
    query: 'device storage health check',
    deviceProfileId: state.profileId,
  });

  const negativeCases = [
    neg(
      'profile-aware',
      'Device help references structured profile id',
      infer.structured.profileId === state.profileId && infer.structured.profileAware === true,
      String(infer.structured.profileId),
    ),
    neg(
      'no-cloud-upload',
      'Device help must not recommend cloud upload',
      !/upload to cloud|send diagnostics to cloud/i.test(infer.text),
      infer.text.slice(0, 160),
    ),
    neg(
      'structured-steps',
      'Device help returns actionable local steps',
      Array.isArray(infer.structured.steps) && (infer.structured.steps as unknown[]).length >= 3,
      String((infer.structured.steps as unknown[])?.length),
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-003',
    title: 'Local-first AI: Device help',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      fixtureProfileId: state.profileId,
      storageHealth: state.storageHealth,
    },
    negativeCases,
    evidencePaths: ['evals/wave003/fixtures/device_state.json'],
    notes: 'Profile-aware deterministic device help driven by structured state fixture.',
  });
}

export async function evaluateAiLocal005(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const det = new DeterministicBaselineBackend();
  const hit = await det.infer({ capability: 'translation', query: 'en to es: hello' });
  const miss = await det.infer({
    capability: 'translation',
    query: 'en to ja: hello',
  });

  const negativeCases = [
    neg(
      'glossary-hit',
      'Supported glossary pair translates deterministically',
      hit.structured.translatedText === 'hola' && hit.structured.glossaryHit === true,
      String(hit.structured.translatedText),
    ),
    neg(
      'unsupported-passthrough',
      'Unsupported pair does not claim neural MT',
      String(miss.structured.translatedText).includes('[local-passthrough:'),
      String(miss.structured.translatedText),
    ),
    neg(
      'no-general-mt-claim',
      'Output must not claim general machine translation',
      !/general machine translation|neural mt|google translate/i.test(hit.text + miss.text),
      'scope=glossary-only',
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-005',
    title: 'Local-first AI: Basic translation',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      glossaryHit: hit.structured.glossaryHit === true,
      offline: hit.structured.offline === true,
      generalMtClaim: false,
    },
    negativeCases,
    evidencePaths: ['src/system-layer/local_inference/backends/deterministic.ts#translation'],
    notes: 'Offline glossary translation only. GENERAL_MT claim boundary remains false.',
  });
}

export async function evaluateAiLocal006(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(ctx.fixtureRoot, 'a11y_ui.json'), 'utf8'),
  ) as { control: string; issue: string };
  const det = new DeterministicBaselineBackend();
  const infer = await det.infer({
    capability: 'a11y',
    query: `${fixture.control} without accessible name`,
  });
  const issues = (infer.structured.issues as Array<{ id: string }>) ?? [];

  const negativeCases = [
    neg(
      'labels-issue',
      'Accessibility assistant flags missing labels',
      issues.some((i) => i.id === 'labels'),
      issues.map((i) => i.id).join(','),
    ),
    neg(
      'wcag-target',
      'WCAG AA target declared',
      infer.structured.wcagTarget === 'AA',
      String(infer.structured.wcagTarget),
    ),
    neg(
      'structured-not-vague',
      'Must not return vague pretty UI advice only',
      infer.structured.kind === 'a11y' && issues.length >= 2,
      String(issues.length),
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-006',
    title: 'Local-first AI: Accessibility services',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      issueCount: issues.length,
      wcagTarget: String(infer.structured.wcagTarget),
    },
    negativeCases,
    evidencePaths: ['evals/wave003/fixtures/a11y_ui.json'],
    notes: 'Structured a11y checklist from deterministic assistant; not a full audit platform.',
  });
}

export async function evaluateAiLocal007(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const rag = new LocalRagEngine(ctx.repoRoot, path.join(ctx.scratchRoot, 'rag-mini'));
  const corpusPath = path.join(ctx.fixtureRoot, 'mini_corpus');
  for (const file of fs.readdirSync(corpusPath)) {
    const text = fs.readFileSync(path.join(corpusPath, file), 'utf8');
    rag.ingestText({
      sourcePath: path.join(corpusPath, file),
      corpus: 'custom',
      title: file,
      text,
    });
  }
  const hit = rag.attribution(`What is ${WAIKE_MARKER}?`);
  const miss = rag.attribution('zzqxv_ungrounded_token_wave003');
  const precision = hit.grounded && !miss.grounded ? 1 : 0;
  const recall = hit.hits.some((h) => h.excerpt.includes(WAIKE_MARKER)) ? 1 : 0;

  const negativeCases = [
    neg(
      'grounded-hit',
      'Known marker retrieved from mini corpus',
      hit.grounded === true && hit.hits.length > 0,
      String(hit.hits.length),
    ),
    neg(
      'ungrounded-refusal',
      'Absent claim not grounded',
      miss.grounded === false,
      String(miss.grounded),
    ),
    neg(
      'attribution-lines',
      'Attribution lines present on hit',
      hit.attributionLines.length > 0,
      String(hit.attributionLines.length),
    ),
  ];

  const pass = negativeCases.every((n) => n.passed) && precision === 1 && recall === 1;

  return validated({
    requirementId: 'AI-LOCAL-007',
    title: 'Local-first AI: Local document retrieval',
    pass,
    runtimeKind: 'LOCAL_RAG_INDEX',
    metrics: { precision, recall, hitCount: hit.hits.length },
    negativeCases,
    evidencePaths: ['evals/wave003/fixtures/mini_corpus/doc-a.md'],
    notes: 'Mini-corpus retrieval metrics on local RAG engine (not cloud search).',
  });
}

export async function evaluateAiLocal008(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const gameState = JSON.parse(
    fs.readFileSync(path.join(ctx.fixtureRoot, 'game_state.json'), 'utf8'),
  ) as { tempo: string; hp: number; wave: number };
  const det = new DeterministicBaselineBackend();
  const infer = await det.infer({
    capability: 'game_coach',
    query: `fast tempo wave ${gameState.wave} hp ${gameState.hp}`,
  });

  const negativeCases = [
    neg(
      'state-analysis',
      'Game coach reads tempo from query/state',
      typeof infer.structured.stateAnalysis === 'object',
      JSON.stringify(infer.structured.stateAnalysis),
    ),
    neg(
      'actionable-tips',
      'Returns >=2 actionable tips',
      Number(infer.structured.actionableCount) >= 2,
      String(infer.structured.actionableCount),
    ),
    neg(
      'deterministic-kind',
      'Uses structured game_coach kind',
      infer.structured.kind === 'game_coach',
      String(infer.structured.kind),
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-008',
    title: 'Local-first AI: Game AI',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      fixtureWave: gameState.wave,
      tips: Number(infer.structured.actionableCount),
    },
    negativeCases,
    evidencePaths: ['evals/wave003/fixtures/game_state.json'],
    notes: 'Deterministic game-state coach; not a trained game-playing agent.',
  });
}

export async function evaluateAiLocal009(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const telemetry = JSON.parse(
    fs.readFileSync(path.join(ctx.fixtureRoot, 'connectivity_telemetry.json'), 'utf8'),
  ) as { bearerPresent: boolean; dnsLocal: boolean; cloudCallsAttempted: number };
  const det = new DeterministicBaselineBackend();
  const infer = await det.infer({
    capability: 'network',
    query: 'diagnose local connectivity with telemetry',
  });
  const doc = fs.readFileSync(
    path.join(ctx.repoRoot, 'fixtures', 'local-runtime', 'documents', 'connectivity-diagnosis.md'),
    'utf8',
  );

  const negativeCases = [
    neg(
      'local-diagnosis',
      'Network assist performs local-only diagnosis',
      /local connectivity diagnosis/i.test(String(infer.structured.diagnosis)),
      String(infer.structured.diagnosis),
    ),
    neg(
      'checklist-present',
      'Checklist includes bearer + offline cache fields',
      (infer.structured.checklist as string[]).includes('bearer_present'),
      (infer.structured.checklist as string[]).join(','),
    ),
    neg(
      'no-invented-cloud-success',
      'Must not invent successful cloud calls when telemetry says zero',
      telemetry.cloudCallsAttempted === 0 &&
        !/successful cloud call/i.test(infer.text) &&
        doc.includes('Never invent a successful cloud call'),
      `cloudCallsAttempted=${telemetry.cloudCallsAttempted}`,
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-009',
    title: 'Local-first AI: Connectivity diagnosis',
    pass,
    runtimeKind: 'LOCAL_TEMPLATE_ENGINE',
    metrics: {
      bearerPresent: telemetry.bearerPresent,
      dnsLocal: telemetry.dnsLocal,
    },
    negativeCases,
    evidencePaths: [
      'evals/wave003/fixtures/connectivity_telemetry.json',
      'fixtures/local-runtime/documents/connectivity-diagnosis.md',
    ],
    notes: 'Connectivity diagnosis uses structured telemetry fixture + approved local pack.',
  });
}

export async function evaluateAiLocal011(ctx: Wave003Context): Promise<RequirementEvalResult> {
  const router = new ModelRouter();
  router.getFleet().ensureFixtureRefs(ctx.repoRoot);
  const route = router.route({
    task: 'tutoring',
    privacy: 'personal',
    contextTokens: 512,
    ramMb: 4096,
    offline: true,
    cloudConsent: true,
  });
  const guard = new LocalOnlyNetworkGuard('local-only');
  let cloudRejected = false;
  try {
    guard.assertCloudCallAllowed('https://api.openai.com/v1/chat/completions');
  } catch {
    cloudRejected = true;
  }
  const product = new GunnchAIProductService(ctx.repoRoot, {
    varRoot: path.join(ctx.scratchRoot, 'product-offline'),
  });
  const assist = await product.assist({
    capability: 'tutoring',
    query: 'teach binary search offline',
    permissions: ['assist', 'audit:read'],
  });

  const negativeCases = [
    neg(
      'offline-route-local',
      'Offline routing selects local tier (cloud consent ignored)',
      route.ok && route.location === 'local' && route.selectedRole !== 'OPTIONAL_FRONTIER_CLOUD',
      `${route.selectedRole}/${route.location}`,
    ),
    neg(
      'cloud-call-rejected',
      'Outbound cloud LLM call rejected under local-only guard',
      cloudRejected,
      String(cloudRejected),
    ),
    neg(
      'basic-assist-without-cloud',
      'Product assist succeeds without cloud path',
      assist.ok === true &&
        assist.provenance.processingMode === 'local-only' &&
        assist.provenance.offline === true,
      JSON.stringify({
        ok: assist.ok,
        processingMode: assist.provenance.processingMode,
        offline: assist.provenance.offline,
      }),
    ),
  ];

  const pass = negativeCases.every((n) => n.passed);

  return validated({
    requirementId: 'AI-LOCAL-011',
    title: 'Cloud models not sole path to basic operation',
    pass,
    runtimeKind: 'LOCAL_PRODUCT_SERVICE',
    metrics: {
      selectedRole: String(route.selectedRole),
      assistOk: assist.ok === true,
      cloudSolePath: false,
    },
    negativeCases,
    evidencePaths: [
      'src/stage2/fleet/router.ts',
      'src/local-runtime/network.ts',
      'src/system-layer/product_service/service.ts',
    ],
    notes: 'Cross-cutting offline kill-switch: router + network guard + product assist all remain local-viable.',
  });
}

export async function evaluateAllAiLocal(ctx: Wave003Context): Promise<RequirementEvalResult[]> {
  return Promise.all([
    evaluateAiLocal001(ctx),
    evaluateAiLocal002(ctx),
    evaluateAiLocal003(ctx),
    evaluateAiLocal005(ctx),
    evaluateAiLocal006(ctx),
    evaluateAiLocal007(ctx),
    evaluateAiLocal008(ctx),
    evaluateAiLocal009(ctx),
    evaluateAiLocal011(ctx),
  ]);
}
