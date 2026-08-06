import type { CapabilityKind, RetrievedDocument, RuntimeAdapter } from '../types';
import { buildProviderIdentities } from '../discovery';

/**
 * Deterministic fixture-backed provider.
 * NEVER represented as a trained LLM.
 */
export class FixtureBackedProvider implements RuntimeAdapter {
  readonly identity = buildProviderIdentities().find(
    (p) => p.kind === 'fixture-backed-deterministic',
  )!;

  async generate(input: {
    capability: CapabilityKind;
    query: string;
    documents: RetrievedDocument[];
    signal?: AbortSignal;
  }): Promise<{ text: string; grounded: boolean; sources: string[] }> {
    if (input.signal?.aborted) {
      const err = new Error('CANCELLED');
      (err as Error & { code: string }).code = 'CANCELLED';
      throw err;
    }

    if (input.capability === 'unsupported') {
      return {
        text:
          'SAFE_FAILURE: unsupported or unsafe request rejected by local runtime policy. ' +
          'No cloud call was attempted. Ask a supported local capability ' +
          '(tutoring, code_assistance, device_help, accessibility, connectivity_diagnosis, document_retrieval).',
        grounded: false,
        sources: [],
      };
    }

    const sources = input.documents.map((d) => d.sourceId);
    const grounded = sources.length > 0;
    const excerpts = input.documents
      .map((d, i) => `(${i + 1}) ${d.title}: ${d.excerpt}`)
      .join('\n');

    const capabilityLead: Record<string, string> = {
      tutoring:
        'Local tutoring response (fixture-backed deterministic provider — NOT a trained LLM).',
      code_assistance:
        'Local code-assistance response (fixture-backed deterministic provider — NOT a trained LLM).',
      device_help:
        'Local device-help response (fixture-backed deterministic provider — NOT a trained LLM). Integration hint: gunnchos-device-os docs (read-only).',
      accessibility:
        'Local accessibility transformation (fixture-backed deterministic provider — NOT a trained LLM).',
      connectivity_diagnosis:
        'Local connectivity-diagnosis explanation (fixture-backed deterministic provider — NOT a trained LLM).',
      document_retrieval:
        'Local document retrieval over approved fixture content (fixture-backed deterministic provider — NOT a trained LLM).',
      health: 'Health check (fixture-backed deterministic provider — NOT a trained LLM).',
    };

    const lead = capabilityLead[input.capability] ?? 'Local response.';
    const transform =
      input.capability === 'accessibility'
        ? `\nPlain-language transform of query: ${plainLanguage(input.query)}`
        : '';

    const text = [
      lead,
      `Query: ${input.query}`,
      grounded
        ? `Grounded excerpts:\n${excerpts}`
        : 'No fixture document matched; returning safe deterministic guidance.',
      transform,
      'Disclosure: processing is LOCAL. This output is fixture-backed, not a cloud or trained LLM completion.',
    ]
      .filter(Boolean)
      .join('\n\n');

    return { text, grounded, sources };
  }
}

function plainLanguage(query: string): string {
  return query
    .replace(/\bamortizes\b/gi, 'reduces')
    .replace(/\blogarithmic\b/gi, 'step-by-step shrinking')
    .replace(/\bresidual interval\b/gi, 'remaining part of the list')
    .replace(/\s+/g, ' ')
    .trim();
}
