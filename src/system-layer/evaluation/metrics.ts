/**
 * Non-AI baselines and structured metrics for Wave C evaluation.
 * "Returns text" alone is NEVER a passing metric.
 */

import type { SystemCapability } from '../model_registry';
import type { InferenceResult } from '../local_inference/backends/interface';

export interface CapabilityEvalSpec {
  capability: SystemCapability;
  purpose: string;
  nonAiBaselineName: string;
  metricName: string;
  latencyBudgetMs: number;
  memoryStubBudgetBytes: number;
  fallbackDescription: string;
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
    metricName: 'tutoring_rubric_coverage',
    latencyBudgetMs: 500,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    fallbackDescription: 'Deterministic tutoring template if optional local model missing.',
  },
  {
    capability: 'code',
    purpose: 'Produce a typed early-return guard with language tag.',
    nonAiBaselineName: 'regex-snippet-dump',
    metricName: 'code_structure_score',
    latencyBudgetMs: 500,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    fallbackDescription: 'Deterministic TypeScript early-return template.',
  },
  {
    capability: 'device_help',
    purpose: 'Give profile-aware local device steps without cloud upload.',
    nonAiBaselineName: 'static-faq-line',
    metricName: 'device_profile_awareness',
    latencyBudgetMs: 500,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    fallbackDescription: 'Profile stub steps from device_profiles.json.',
  },
  {
    capability: 'game_coach',
    purpose: 'Provide state analysis plus actionable tips.',
    nonAiBaselineName: 'generic-try-harder',
    metricName: 'game_coach_actionability',
    latencyBudgetMs: 500,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    fallbackDescription: 'Deterministic two-tip coach template.',
  },
  {
    capability: 'network',
    purpose: 'Local connectivity diagnosis checklist without outbound calls.',
    nonAiBaselineName: 'check-wifi-string',
    metricName: 'network_checklist_completeness',
    latencyBudgetMs: 500,
    memoryStubBudgetBytes: 32 * 1024 * 1024,
    fallbackDescription: 'Local diagnosis checklist template.',
  },
  {
    capability: 'rag',
    purpose: 'Rank local documents and attribute sources.',
    nonAiBaselineName: 'first-doc-dump',
    metricName: 'rag_source_attribution',
    latencyBudgetMs: 2000,
    memoryStubBudgetBytes: 64 * 1024 * 1024,
    fallbackDescription: 'Gate 1 local-runtime fixture retrieval bridge.',
  },
];

/** Non-AI baselines: intentionally weak / unstructured. */
export function runNonAiBaseline(
  capability: SystemCapability,
  query: string,
): { text: string; structured: Record<string, unknown> } {
  switch (capability) {
    case 'tutoring':
      return {
        text: `Echo: ${query}`,
        structured: { kind: 'echo' },
      };
    case 'code':
      return {
        text: 'function x(){ return x }',
        structured: { kind: 'regex-dump' },
      };
    case 'device_help':
      return {
        text: 'Try turning it off and on.',
        structured: { kind: 'faq' },
      };
    case 'game_coach':
      return {
        text: 'Try harder.',
        structured: { kind: 'generic' },
      };
    case 'network':
      return {
        text: 'Check wifi.',
        structured: { kind: 'one-liner' },
      };
    case 'rag':
      return {
        text: query,
        structured: { kind: 'dump', rankedSources: [] },
      };
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

  // Hard fail path: mere non-empty text is insufficient.
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
      details.push(
        `concept=${hasConcept}`,
        `steps=${steps.length}`,
        `check=${hasCheck}`,
      );
      return finish(
        'tutoring_rubric_coverage',
        systemScore,
        baselineScore,
        details,
        systemScore > baselineScore,
      );
    }
    case 'code': {
      const code = String(system.structured.code ?? '');
      const lang = system.structured.language === 'typescript';
      const pattern = system.structured.pattern === 'early-return-guard';
      const hasFence = /```typescript[\s\S]*early|return/i.test(code) || /```typescript/.test(code);
      const hasEarlyReturn = /if\s*\(.*\)\s*return/i.test(code);
      const systemScore =
        (lang ? 1 : 0) + (pattern ? 1 : 0) + (hasFence ? 1 : 0) + (hasEarlyReturn ? 1 : 0);
      const baselineScore = /function/.test(baseline.text) ? 1 : 0;
      details.push(`lang=${lang}`, `pattern=${pattern}`, `fence=${hasFence}`, `early=${hasEarlyReturn}`);
      return finish(
        'code_structure_score',
        systemScore,
        baselineScore,
        details,
        systemScore > baselineScore,
      );
    }
    case 'device_help': {
      const profileAware = system.structured.profileAware === true;
      const steps = Array.isArray(system.structured.steps)
        ? system.structured.steps
        : [];
      const mentionsProfile =
        typeof system.structured.profileId === 'string' &&
        system.structured.profileId.length > 0;
      const systemScore =
        (profileAware ? 2 : 0) + (mentionsProfile ? 1 : 0) + (steps.length >= 3 ? 1 : 0);
      const baselineScore = baseline.text.length > 0 ? 1 : 0;
      details.push(
        `profileAware=${profileAware}`,
        `profileId=${String(system.structured.profileId)}`,
        `steps=${steps.length}`,
      );
      return finish(
        'device_profile_awareness',
        systemScore,
        baselineScore,
        details,
        systemScore > baselineScore,
      );
    }
    case 'game_coach': {
      const tips = Array.isArray(system.structured.tips)
        ? system.structured.tips
        : [];
      const hasState =
        system.structured.stateAnalysis != null &&
        typeof system.structured.stateAnalysis === 'object';
      const systemScore = (hasState ? 2 : 0) + Math.min(tips.length, 2);
      const baselineScore = baseline.structured.kind === 'generic' ? 1 : 0;
      details.push(`state=${hasState}`, `tips=${tips.length}`);
      return finish(
        'game_coach_actionability',
        systemScore,
        baselineScore,
        details,
        systemScore > baselineScore,
      );
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
      const systemScore = hits;
      const baselineScore = /wifi/i.test(baseline.text) ? 1 : 0;
      details.push(`checklistHits=${hits}/${required.length}`);
      return finish(
        'network_checklist_completeness',
        systemScore,
        baselineScore,
        details,
        systemScore > baselineScore,
      );
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
      // Complement baseline even when corpus miss: structured empty retrieval > dump
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

/** Reject answers that are only free text with no structured payload. */
export function assertNotTextOnly(result: InferenceResult): void {
  if (!result.structured || Object.keys(result.structured).length === 0) {
    throw new Error('EVAL_REJECT: result is text-only; structured fields required');
  }
  if (!result.text || !result.text.trim()) {
    throw new Error('EVAL_REJECT: empty text');
  }
}
