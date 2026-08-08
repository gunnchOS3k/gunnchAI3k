/**
 * Non-AI baselines, datasets, and structured metrics for Continuance III.
 * Per capability: baseline, dataset, quality metric, latency, memory,
 * failure, privacy, fallback, model version.
 * "Returns text" alone is NEVER a passing metric.
 */

import type { SystemCapability } from '../model_registry';
import { ALL_SYSTEM_CAPABILITIES } from '../model_registry';
import type { InferenceResult } from '../local_inference/backends/interface';

export interface CapabilityEvalSpec {
  capability: SystemCapability;
  purpose: string;
  nonAiBaselineName: string;
  datasetId: string;
  datasetSize: number;
  metricName: string;
  latencyBudgetMs: number;
  memoryStubBudgetBytes: number;
  failureModes: string[];
  privacyClass: 'local-only' | 'local-preferred' | 'cloud-eligible-with-consent';
  fallbackDescription: string;
  modelVersion: string;
}

export interface MetricScore {
  metricName: string;
  systemScore: number;
  baselineScore: number;
  beatsOrComplementsBaseline: boolean;
  details: string[];
  /** True only when structured fields were scored (not mere text presence). */
  structuredEvaluation: boolean;
}

export const CAPABILITY_SPECS: CapabilityEvalSpec[] = [
  {
    capability: 'tutoring',
    purpose: 'Teach a concept with steps and a check question.',
    nonAiBaselineName: 'echo-glossary',
    datasetId: 'fixtures/system-layer/eval/tutoring.jsonl',
    datasetSize: 3,
    metricName: 'tutoring_rubric_coverage',
    latencyBudgetMs: 2000,
    memoryStubBudgetBytes: 64 * 1024 * 1024,
    failureModes: ['empty_concept', 'missing_check', 'text_only'],
    privacyClass: 'local-preferred',
    fallbackDescription: 'Deterministic tutoring template if llama.cpp missing.',
    modelVersion: 'det-tutoring-v1@1.1.0',
  },
  {
    capability: 'code',
    purpose: 'Produce a typed early-return guard with language tag.',
    nonAiBaselineName: 'regex-snippet-dump',
    datasetId: 'fixtures/system-layer/eval/code.jsonl',
    datasetSize: 3,
    metricName: 'code_structure_score',
    latencyBudgetMs: 2000,
    memoryStubBudgetBytes: 64 * 1024 * 1024,
    failureModes: ['no_fence', 'no_early_return', 'wrong_language'],
    privacyClass: 'local-preferred',
    fallbackDescription: 'Deterministic TypeScript early-return template.',
    modelVersion: 'det-code-v1@1.1.0',
  },
  {
    capability: 'device_help',
    purpose: 'Give profile-aware local device steps without cloud upload.',
    nonAiBaselineName: 'static-faq-line',
    datasetId: 'fixtures/system-layer/eval/device_help.jsonl',
    datasetSize: 3,
    metricName: 'device_profile_awareness',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['profile_blind', 'cloud_leak_hint'],
    privacyClass: 'local-only',
    fallbackDescription: 'Profile stub steps from device_profiles.json.',
    modelVersion: 'det-device_help-v1@1.1.0',
  },
  {
    capability: 'a11y',
    purpose: 'Surface accessibility issues with WCAG-oriented fixes.',
    nonAiBaselineName: 'make-it-pretty',
    datasetId: 'fixtures/system-layer/eval/a11y.jsonl',
    datasetSize: 3,
    metricName: 'a11y_checklist_coverage',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['no_checklist', 'no_issues'],
    privacyClass: 'local-only',
    fallbackDescription: 'Deterministic WCAG AA checklist template.',
    modelVersion: 'det-a11y-v1@1.1.0',
  },
  {
    capability: 'game_coach',
    purpose: 'Provide state analysis plus actionable tips.',
    nonAiBaselineName: 'generic-try-harder',
    datasetId: 'fixtures/system-layer/eval/game_coach.jsonl',
    datasetSize: 3,
    metricName: 'game_coach_actionability',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['no_state', 'generic_only'],
    privacyClass: 'local-only',
    fallbackDescription: 'Deterministic two-tip coach template.',
    modelVersion: 'det-game_coach-v1@1.1.0',
  },
  {
    capability: 'network',
    purpose: 'Local connectivity diagnosis + optimization checklist.',
    nonAiBaselineName: 'check-wifi-string',
    datasetId: 'fixtures/system-layer/eval/network.jsonl',
    datasetSize: 3,
    metricName: 'network_checklist_completeness',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['incomplete_checklist', 'forced_cloud'],
    privacyClass: 'local-only',
    fallbackDescription: 'Local diagnosis checklist template.',
    modelVersion: 'det-network-v1@1.1.0',
  },
  {
    capability: 'rag',
    purpose: 'Rank local documents and attribute sources.',
    nonAiBaselineName: 'first-doc-dump',
    datasetId: 'fixtures/system-layer/eval/rag.jsonl',
    datasetSize: 3,
    metricName: 'rag_source_attribution',
    latencyBudgetMs: 3000,
    memoryStubBudgetBytes: 64 * 1024 * 1024,
    failureModes: ['ungrounded', 'no_sources'],
    privacyClass: 'local-preferred',
    fallbackDescription: 'Gate 1 local-runtime fixture retrieval bridge.',
    modelVersion: 'det-rag-v1@1.1.0+local-runtime-fixture-bridge-v1',
  },
  {
    capability: 'scientific',
    purpose: 'Attribute claims to local sources with explicit caveats.',
    nonAiBaselineName: 'unsourced-assert',
    datasetId: 'fixtures/system-layer/eval/scientific.jsonl',
    datasetSize: 3,
    metricName: 'scientific_attribution_score',
    latencyBudgetMs: 1500,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['no_attribution', 'overclaim'],
    privacyClass: 'local-preferred',
    fallbackDescription: 'Local claim+caveat template.',
    modelVersion: 'det-scientific-v1@1.1.0',
  },
  {
    capability: 'translation',
    purpose: 'Offline glossary/passthrough translation with language tags.',
    nonAiBaselineName: 'identity-copy',
    datasetId: 'fixtures/system-layer/eval/translation.jsonl',
    datasetSize: 3,
    metricName: 'translation_structure_score',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['missing_langs', 'cloud_required_false_claim'],
    privacyClass: 'local-preferred',
    fallbackDescription: 'Tiny offline glossary + passthrough.',
    modelVersion: 'det-translation-v1@1.1.0',
  },
  {
    capability: 'workflow',
    purpose: 'Produce an offline automatable workflow with audit steps.',
    nonAiBaselineName: 'todo-one-liner',
    datasetId: 'fixtures/system-layer/eval/workflow.jsonl',
    datasetSize: 3,
    metricName: 'workflow_step_completeness',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['too_few_steps', 'requires_cloud_true'],
    privacyClass: 'local-only',
    fallbackDescription: 'Four-step local workflow template.',
    modelVersion: 'det-workflow-v1@1.1.0',
  },
  {
    capability: 'security',
    purpose: 'Explain defensive security without exploit payloads.',
    nonAiBaselineName: 'scary-warning',
    datasetId: 'fixtures/system-layer/eval/security.jsonl',
    datasetSize: 3,
    metricName: 'security_explanation_score',
    latencyBudgetMs: 1000,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    failureModes: ['exploit_payload', 'no_controls'],
    privacyClass: 'local-only',
    fallbackDescription: 'Defensive explanation template; refuses exploits.',
    modelVersion: 'det-security-v1@1.1.0',
  },
];

if (CAPABILITY_SPECS.length !== ALL_SYSTEM_CAPABILITIES.length) {
  // Keep harness honest if capabilities drift.
  throw new Error('CAPABILITY_SPECS must cover ALL_SYSTEM_CAPABILITIES');
}

/** Non-AI baselines: intentionally weak / unstructured. */
export function runNonAiBaseline(
  capability: SystemCapability,
  query: string,
): { text: string; structured: Record<string, unknown> } {
  switch (capability) {
    case 'tutoring':
      return { text: `Echo: ${query}`, structured: { kind: 'echo' } };
    case 'code':
      return { text: 'function x(){ return x }', structured: { kind: 'regex-dump' } };
    case 'device_help':
      return { text: 'Try turning it off and on.', structured: { kind: 'faq' } };
    case 'a11y':
      return { text: 'Make it pretty.', structured: { kind: 'vague' } };
    case 'game_coach':
      return { text: 'Try harder.', structured: { kind: 'generic' } };
    case 'network':
      return { text: 'Check wifi.', structured: { kind: 'one-liner' } };
    case 'rag':
      return { text: query, structured: { kind: 'dump', rankedSources: [] } };
    case 'scientific':
      return { text: 'This is definitely true.', structured: { kind: 'unsourced' } };
    case 'translation':
      return { text: query, structured: { kind: 'identity' } };
    case 'workflow':
      return { text: 'Do the thing.', structured: { kind: 'todo' } };
    case 'security':
      return { text: 'Be careful.', structured: { kind: 'warning' } };
    default:
      return { text: String(query), structured: {} };
  }
}

export function scoreSystemAgainstBaseline(
  capability: SystemCapability,
  system: InferenceResult,
  baseline: { text: string; structured: Record<string, unknown> },
): MetricScore {
  const details: string[] = [];

  const textOnly =
    Boolean(system.text && system.text.trim().length > 0) &&
    (!system.structured || Object.keys(system.structured).length === 0);
  if (textOnly) {
    return {
      metricName: 'insufficient_text_only',
      systemScore: 0,
      baselineScore: 1,
      beatsOrComplementsBaseline: false,
      details: [
        'FAIL: system only returned text without structured evaluation fields.',
      ],
      structuredEvaluation: false,
    };
  }

  switch (capability) {
    case 'tutoring': {
      const s = system.structured;
      const hasConcept = typeof s.concept === 'string' && s.concept.length > 0;
      const steps = Array.isArray(s.steps) ? s.steps : [];
      const hasCheck =
        typeof s.checkQuestion === 'string' && s.checkQuestion.length > 0;
      const systemScore =
        (hasConcept ? 1 : 0) + (steps.length >= 3 ? 1 : 0) + (hasCheck ? 1 : 0);
      const baselineScore =
        baseline.structured.kind === 'echo' ? 1 : baseline.text.length > 0 ? 1 : 0;
      details.push(`concept=${hasConcept}`, `steps=${steps.length}`, `check=${hasCheck}`);
      return finish('tutoring_rubric_coverage', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'code': {
      const code = String(system.structured.code ?? '');
      const lang = system.structured.language === 'typescript';
      const pattern = system.structured.pattern === 'early-return-guard';
      const hasFence = /```typescript/.test(code);
      const hasEarlyReturn = /if\s*\(.*\)\s*return/i.test(code);
      const systemScore =
        (lang ? 1 : 0) + (pattern ? 1 : 0) + (hasFence ? 1 : 0) + (hasEarlyReturn ? 1 : 0);
      const baselineScore = /function/.test(baseline.text) ? 1 : 0;
      details.push(`lang=${lang}`, `pattern=${pattern}`, `fence=${hasFence}`, `early=${hasEarlyReturn}`);
      return finish('code_structure_score', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'device_help': {
      const profileAware = system.structured.profileAware === true;
      const steps = Array.isArray(system.structured.steps) ? system.structured.steps : [];
      const mentionsProfile =
        typeof system.structured.profileId === 'string' &&
        system.structured.profileId.length > 0;
      const systemScore =
        (profileAware ? 2 : 0) + (mentionsProfile ? 1 : 0) + (steps.length >= 3 ? 1 : 0);
      const baselineScore = baseline.text.length > 0 ? 1 : 0;
      details.push(`profileAware=${profileAware}`, `steps=${steps.length}`);
      return finish('device_profile_awareness', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'a11y': {
      const checklist = Array.isArray(system.structured.checklist)
        ? (system.structured.checklist as string[])
        : [];
      const issues = Array.isArray(system.structured.issues)
        ? system.structured.issues
        : [];
      const wcag = system.structured.wcagTarget === 'AA' || system.structured.wcagTarget === 'AAA';
      const systemScore =
        (checklist.length >= 3 ? 2 : 0) + (issues.length >= 2 ? 1 : 0) + (wcag ? 1 : 0);
      const baselineScore = baseline.structured.kind === 'vague' ? 1 : 0;
      details.push(`checklist=${checklist.length}`, `issues=${issues.length}`, `wcag=${wcag}`);
      return finish('a11y_checklist_coverage', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'game_coach': {
      const tips = Array.isArray(system.structured.tips) ? system.structured.tips : [];
      const hasState =
        system.structured.stateAnalysis != null &&
        typeof system.structured.stateAnalysis === 'object';
      const systemScore = (hasState ? 2 : 0) + Math.min(tips.length, 2);
      const baselineScore = baseline.structured.kind === 'generic' ? 1 : 0;
      details.push(`state=${hasState}`, `tips=${tips.length}`);
      return finish('game_coach_actionability', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'network': {
      const checklist = Array.isArray(system.structured.checklist)
        ? (system.structured.checklist as string[])
        : [];
      const required = [
        'bearer_present',
        'dns_resolves_local',
        'offline_cache_ok',
        'no_forced_cloud',
      ];
      const hits = required.filter((r) => checklist.includes(r)).length;
      const opts = Array.isArray(system.structured.optimizations)
        ? system.structured.optimizations
        : [];
      const systemScore = hits + (opts.length >= 1 ? 1 : 0);
      const baselineScore = /wifi/i.test(baseline.text) ? 1 : 0;
      details.push(`checklistHits=${hits}/${required.length}`, `opts=${opts.length}`);
      return finish('network_checklist_completeness', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'rag': {
      const ranked = Array.isArray(system.structured.rankedSources)
        ? (system.structured.rankedSources as unknown[])
        : [];
      const hasSources = system.sources.length > 0 || ranked.length > 0;
      const grounded = system.grounded === true;
      const localBridge = system.structured.localRuntimeOk === true;
      const systemScore =
        (hasSources ? 2 : 0) + (grounded ? 2 : 0) + (localBridge ? 1 : 0);
      const baselineScore =
        Array.isArray(baseline.structured.rankedSources) &&
        (baseline.structured.rankedSources as unknown[]).length > 0
          ? 2
          : 0;
      details.push(
        `sources=${system.sources.length}`,
        `ranked=${ranked.length}`,
        `grounded=${grounded}`,
        `localBridge=${localBridge}`,
      );
      const complements =
        systemScore > baselineScore ||
        (ranked.length === 0 &&
          system.structured.kind === 'rag' &&
          typeof system.structured.answer === 'string');
      return finish(
        'rag_source_attribution',
        systemScore,
        baselineScore,
        details,
        complements && (hasSources || localBridge || grounded || systemScore >= 1),
      );
    }
    case 'scientific': {
      const attrs = Array.isArray(system.structured.attributions)
        ? system.structured.attributions
        : [];
      const caveats = Array.isArray(system.structured.caveats)
        ? system.structured.caveats
        : [];
      const hasClaim = typeof system.structured.claim === 'string';
      const systemScore =
        (hasClaim ? 1 : 0) + (attrs.length >= 1 ? 2 : 0) + (caveats.length >= 1 ? 1 : 0);
      const baselineScore = baseline.structured.kind === 'unsourced' ? 1 : 0;
      details.push(`claim=${hasClaim}`, `attrs=${attrs.length}`, `caveats=${caveats.length}`);
      return finish('scientific_attribution_score', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'translation': {
      const hasSource = typeof system.structured.sourceLang === 'string';
      const hasTarget = typeof system.structured.targetLang === 'string';
      const hasText = typeof system.structured.translatedText === 'string';
      const offline = system.structured.offline === true;
      const systemScore =
        (hasSource ? 1 : 0) + (hasTarget ? 1 : 0) + (hasText ? 1 : 0) + (offline ? 1 : 0);
      const baselineScore = baseline.structured.kind === 'identity' ? 1 : 0;
      details.push(`src=${hasSource}`, `tgt=${hasTarget}`, `text=${hasText}`, `offline=${offline}`);
      return finish('translation_structure_score', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'workflow': {
      const steps = Array.isArray(system.structured.steps) ? system.structured.steps : [];
      const automatable = system.structured.automatable === true;
      const noCloud = system.structured.requiresCloud === false;
      const systemScore =
        (steps.length >= 4 ? 2 : 0) + (automatable ? 1 : 0) + (noCloud ? 1 : 0);
      const baselineScore = baseline.structured.kind === 'todo' ? 1 : 0;
      details.push(`steps=${steps.length}`, `auto=${automatable}`, `noCloud=${noCloud}`);
      return finish('workflow_step_completeness', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    case 'security': {
      const controls = Array.isArray(system.structured.defensiveControls)
        ? system.structured.defensiveControls
        : [];
      const refuses = system.structured.refusesExploitPayload === true;
      const explanation = Array.isArray(system.structured.explanation)
        ? system.structured.explanation
        : [];
      const systemScore =
        (controls.length >= 2 ? 2 : 0) + (refuses ? 2 : 0) + (explanation.length >= 2 ? 1 : 0);
      const baselineScore = baseline.structured.kind === 'warning' ? 1 : 0;
      details.push(`controls=${controls.length}`, `refuses=${refuses}`, `expl=${explanation.length}`);
      return finish('security_explanation_score', systemScore, baselineScore, details, systemScore > baselineScore);
    }
    default:
      return {
        metricName: 'unknown',
        systemScore: 0,
        baselineScore: 0,
        beatsOrComplementsBaseline: false,
        details: ['unknown capability'],
        structuredEvaluation: false,
      };
  }
}

function finish(
  metricName: string,
  systemScore: number,
  baselineScore: number,
  details: string[],
  beats: boolean,
): MetricScore {
  return {
    metricName,
    systemScore,
    baselineScore,
    beatsOrComplementsBaseline: beats,
    details,
    structuredEvaluation: true,
  };
}

export function assertNotTextOnly(result: InferenceResult): void {
  if (!result.structured || Object.keys(result.structured).length === 0) {
    throw new Error('EVAL_REJECT: result is text-only; structured fields required');
  }
  if (!result.text || !result.text.trim()) {
    throw new Error('EVAL_REJECT: empty text');
  }
}
