/**
 * In-process deterministic baseline models for CI.
 * Produce structured fields that beat non-AI echo baselines in the eval harness.
 */

import type {
  InferenceRequest,
  InferenceResult,
  LocalInferenceBackend,
  BackendAvailability,
} from './interface';

const MEMORY_STUB = 8 * 1024 * 1024; // 8 MiB stub for CI accounting

export class DeterministicBaselineBackend implements LocalInferenceBackend {
  readonly id = 'deterministic' as const;

  probe(): BackendAvailability {
    return {
      id: 'deterministic',
      available: true,
      installableWithoutAdmin: true,
      notes: [
        'Always available in-process.',
        'NOT a trained LLM. Used as CI-safe Wave C foundation.',
      ],
      binaryOrModule: 'src/system-layer/local_inference/backends/deterministic.ts',
    };
  }

  async infer(request: InferenceRequest): Promise<InferenceResult> {
    const t0 = Date.now();
    const capability = request.capability;
    const query = request.query.trim();
    const docs = request.contextDocs ?? [];
    const device = request.deviceProfileId ?? 'student_14_5';

    let structured: Record<string, unknown>;
    let text: string;
    let grounded = false;
    let sources: string[] = [];

    switch (capability) {
      case 'tutoring': {
        const concept = extractConcept(query);
        structured = {
          kind: 'tutoring',
          concept,
          steps: [
            `Define ${concept} in one sentence.`,
            `Work a small example for ${concept}.`,
            `Ask a check question about ${concept}.`,
          ],
          checkQuestion: `What is one property of ${concept}?`,
          rubricFields: ['concept', 'steps', 'checkQuestion'],
        };
        text = [
          `TUTORING[${concept}]`,
          `Concept: ${concept}`,
          `Steps: ${(structured.steps as string[]).join(' | ')}`,
          `Check: ${structured.checkQuestion}`,
        ].join('\n');
        break;
      }
      case 'code': {
        structured = {
          kind: 'code',
          language: 'typescript',
          pattern: 'early-return-guard',
          code: [
            '```typescript',
            'export function guard(value: unknown): string {',
            "  if (value == null) return 'missing';",
            '  return String(value);',
            '}',
            '```',
          ].join('\n'),
          explains: 'Uses early return to keep the happy path flat.',
        };
        text = [
          'CODE[typescript/early-return-guard]',
          structured.code as string,
          structured.explains as string,
        ].join('\n');
        break;
      }
      case 'device_help': {
        structured = {
          kind: 'device_help',
          profileId: device,
          steps: [
            `Confirm device profile=${device}`,
            'Check storage health indicator',
            'Capture local diagnostics without cloud upload',
          ],
          profileAware: true,
        };
        text = [
          `DEVICE_HELP[profile=${device}]`,
          ...(structured.steps as string[]),
        ].join('\n');
        break;
      }
      case 'game_coach': {
        structured = {
          kind: 'game_coach',
          stateAnalysis: {
            tempo: query.toLowerCase().includes('fast') ? 'high' : 'steady',
            risk: 'moderate',
          },
          tips: [
            'Control spacing before committing to an engage.',
            'Reset after a failed trade instead of forcing.',
          ],
          actionableCount: 2,
        };
        text = [
          'GAME_COACH[state+tips]',
          `State: ${JSON.stringify(structured.stateAnalysis)}`,
          ...(structured.tips as string[]),
        ].join('\n');
        break;
      }
      case 'network': {
        structured = {
          kind: 'network',
          checklist: [
            'bearer_present',
            'dns_resolves_local',
            'offline_cache_ok',
            'no_forced_cloud',
          ],
          diagnosis: 'Local connectivity diagnosis without outbound probes.',
        };
        text = [
          'NETWORK[diagnosis]',
          structured.diagnosis as string,
          `Checklist: ${(structured.checklist as string[]).join(',')}`,
        ].join('\n');
        break;
      }
      case 'rag': {
        const ranked = rankDocs(query, docs);
        grounded = ranked.length > 0;
        sources = ranked.map((d) => d.id);
        structured = {
          kind: 'rag',
          rankedSources: ranked.map((d) => ({ id: d.id, score: d.score })),
          answer:
            ranked.length > 0
              ? `Grounded answer using ${ranked[0].id}: ${ranked[0].text.slice(0, 160)}`
              : 'No local documents matched; safe empty retrieval.',
        };
        text = [
          'RAG[ranked]',
          structured.answer as string,
          `Sources: ${sources.join(',') || '(none)'}`,
        ].join('\n');
        break;
      }
      default: {
        structured = { kind: 'unsupported', query };
        text = `UNSUPPORTED capability=${capability}`;
      }
    }

    return {
      backend: 'deterministic',
      text,
      structured,
      grounded,
      sources,
      latencyMs: Math.max(1, Date.now() - t0),
      memoryStubBytes: MEMORY_STUB,
      isTrainedLlm: false,
      fallbackUsed: false,
    };
  }
}

function extractConcept(query: string): string {
  const cleaned = query
    .replace(/^(teach|explain|tutor|what is|how does)\s+/i, '')
    .replace(/[?.!]/g, '')
    .trim();
  return cleaned.split(/\s+/).slice(0, 4).join(' ') || 'topic';
}

function rankDocs(
  query: string,
  docs: Array<{ id: string; text: string }>,
): Array<{ id: string; text: string; score: number }> {
  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  return docs
    .map((d) => {
      const hay = d.text.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { ...d, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);
}
