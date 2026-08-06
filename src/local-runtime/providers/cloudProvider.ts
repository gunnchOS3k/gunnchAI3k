import type { CapabilityKind, RetrievedDocument, RuntimeAdapter, ProviderIdentity } from '../types';
import { LocalOnlyNetworkGuard } from '../network';

/**
 * Cloud provider stub used only to prove local-only rejection.
 * Must never succeed while processingMode is local-only.
 */
export class CloudProviderStub implements RuntimeAdapter {
  readonly identity: ProviderIdentity = {
    id: 'cloud-provider-stub',
    kind: 'cloud',
    label: 'Cloud provider stub',
    isTrainedLlm: true,
    modelId: 'cloud-remote',
    available: false,
    discoveryNotes: ['Rejected in local-only mode.'],
  };

  constructor(private readonly guard: LocalOnlyNetworkGuard) {}

  async generate(_input: {
    capability: CapabilityKind;
    query: string;
    documents: RetrievedDocument[];
    signal?: AbortSignal;
  }): Promise<{ text: string; grounded: boolean; sources: string[] }> {
    const target = 'https://api.openai.com/v1/chat/completions';
    this.guard.assertCloudCallAllowed(target);
    // If cloud were allowed, we still refuse silent calls in this smoke path.
    const err = new Error('CLOUD_NOT_IMPLEMENTED: cloud enhancement is not part of Gate 1 smoke');
    (err as Error & { code: string }).code = 'CLOUD_NOT_IMPLEMENTED';
    throw err;
  }
}
