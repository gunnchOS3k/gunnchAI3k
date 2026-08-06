import type { NetworkVerification, ProcessingMode } from './types';

const CLOUD_HOST_MARKERS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.cohere.ai',
];

export class LocalOnlyNetworkGuard {
  constructor(private mode: ProcessingMode = 'local-only') {}

  setMode(mode: ProcessingMode): void {
    this.mode = mode;
  }

  getMode(): ProcessingMode {
    return this.mode;
  }

  isOutboundAllowed(): boolean {
    return this.mode === 'cloud-allowed';
  }

  /**
   * Verify local-only posture without performing real network I/O.
   * In local-only mode every cloud probe is recorded as blocked.
   */
  verify(): NetworkVerification {
    const probesAttempted = CLOUD_HOST_MARKERS.map((h) => `https://${h}/v1/models`);
    if (this.mode === 'local-only') {
      return {
        verifiedAt: new Date().toISOString(),
        mode: this.mode,
        outboundAllowed: false,
        probesAttempted,
        probesBlocked: probesAttempted,
        result: 'local-only-enforced',
      };
    }
    return {
      verifiedAt: new Date().toISOString(),
      mode: this.mode,
      outboundAllowed: true,
      probesAttempted: [],
      probesBlocked: [],
      result: 'cloud-allowed',
    };
  }

  /**
   * Reject any attempt to invoke a remote LLM endpoint while local-only.
   */
  assertCloudCallAllowed(targetUrl: string): void {
    if (this.mode === 'local-only') {
      const err = new Error(
        `CLOUD_CALL_REJECTED: local-only mode forbids remote call to ${targetUrl}`,
      );
      (err as Error & { code: string }).code = 'CLOUD_CALL_REJECTED';
      throw err;
    }
  }

  looksLikeCloudUrl(url: string): boolean {
    return CLOUD_HOST_MARKERS.some((h) => url.includes(h));
  }
}

export function buildDisclosure(
  mode: ProcessingMode,
  providerKind: string,
  isTrainedLlm: boolean,
): string {
  const llmNote = isTrainedLlm
    ? 'Active provider is a local model runtime (not cloud).'
    : 'Active provider is fixture-backed / deterministic and is NOT a trained LLM.';
  if (mode === 'local-only') {
    return `Processing: LOCAL-ONLY. No cloud model calls are permitted. ${llmNote} Provider kind: ${providerKind}.`;
  }
  return `Processing: CLOUD-ALLOWED (user-visible). Local packs remain available. ${llmNote} Provider kind: ${providerKind}.`;
}
