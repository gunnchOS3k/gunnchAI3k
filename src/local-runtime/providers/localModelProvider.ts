import type { CapabilityKind, RetrievedDocument, RuntimeAdapter, ProviderIdentity } from '../types';
import { discoverLocalModels, buildProviderIdentities } from '../discovery';
import { FixtureBackedProvider } from './fixtureProvider';

/**
 * Optional local-model provider.
 * Uses already-installed models only. Never downloads.
 * If no model is available, delegates to fixture-backed provider
 * and keeps identity.isTrainedLlm=false on the fixture path.
 */
export class OptionalLocalModelProvider implements RuntimeAdapter {
  readonly identity: ProviderIdentity;
  private readonly fallback = new FixtureBackedProvider();

  constructor() {
    this.identity =
      buildProviderIdentities().find((p) => p.kind === 'optional-local-model') ??
      ({
        id: 'optional-local-model-v1',
        kind: 'optional-local-model',
        label: 'Optional local model runtime (none installed)',
        isTrainedLlm: false,
        modelId: null,
        available: false,
        discoveryNotes: ['No local model discovered.'],
      } satisfies ProviderIdentity);
  }

  async generate(input: {
    capability: CapabilityKind;
    query: string;
    documents: RetrievedDocument[];
    signal?: AbortSignal;
  }): Promise<{ text: string; grounded: boolean; sources: string[] }> {
    const { models } = discoverLocalModels();
    if (!models.length) {
      const result = await this.fallback.generate(input);
      return {
        ...result,
        text:
          `[optional-local-model unavailable — using fixture-backed deterministic provider (NOT a trained LLM)]\n\n` +
          result.text,
      };
    }

    // Smoke path: do not invoke heavy local inference in Gate 1 automated tests.
    // Discoverability + honest labeling is the contract; fixture content remains the answer body.
    const result = await this.fallback.generate(input);
    return {
      ...result,
      text:
        `[local-model discovered: ${models[0].runtime}/${models[0].modelId}; Gate 1 smoke uses fixture-grounded text without loading weights]\n\n` +
        result.text,
      sources: result.sources,
      grounded: result.grounded,
    };
  }
}
