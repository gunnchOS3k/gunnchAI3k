/**
 * Continuance VI — explicit QEMU / host-forward topology for gunnchAI models.
 *
 * QEMU guest (gunnchOS ai_interface) may not pack a GGUF or llama.cpp binary.
 * In that case the guest host-forwards localhost:8791 (or dynamic port) to the
 * developer host where gunnchAI3k product-service + optional llama.cpp run.
 */

export const OS_INTEGRATION_TOPOLOGY = {
  schema: 'gunnchai.os_integration.topology.v1',
  continuation: 'VI',
  claimBoundary:
    'Documents digital integration topology only. Does not claim physical device AI acceleration, production cloud, or FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE.',
  planes: {
    guest: {
      role: 'gunnchOS ai_interface supervised service',
      bind: 'loopback inside guest OR host-forwarded port',
      responsibilities: [
        'capability discovery',
        'permission checks',
        'timeout / cancel propagation',
        'consent + privacy mode',
        'unavailable fallback messaging',
      ],
    },
    hostForward: {
      role: 'QEMU user-net / forward localhost:GUEST_PORT → host:HOST_PORT',
      defaultHostPort: 8791,
      note: 'Guest treats 127.0.0.1:forwarded as local; model weights stay on host.',
    },
    hostProductService: {
      role: 'gunnchAI3k product-service (Node)',
      bind: '127.0.0.1 only',
      endpoints: [
        '/health',
        '/v1/os/discover',
        '/v1/os/model-status',
        '/v1/os/rag-status',
        '/v1/assist/*',
        '/v1/rag/*',
        '/v1/governance/*',
        '/v1/audit',
        '/v1/continuity/*',
      ],
    },
    hostModelRuntime: {
      role: 'llama.cpp + GGUF (optional) with deterministic fallback',
      location: 'host filesystem under models/local',
      qemuMayHostForwardModel: true,
      unavailableFallback: 'deterministic-baseline + SAFE_FALLBACK',
    },
  },
  sequence: [
    'gunnchOS app → ai_interface.tutor_start / assist',
    'ai_interface HTTP client → 127.0.0.1 (possibly host-forwarded)',
    'product-service governance + permissions + timeout/cancel',
    'local inference (llama.cpp) OR deterministic fallback',
    'RAG attribution / audit / continuity as requested',
    'structured response + provenance back to guest',
  ],
} as const;

export function describeTopology(): string {
  return [
    'Topology: gunnchOS guest ai_interface → QEMU host-forward → gunnchAI3k product-service@127.0.0.1',
    'Model: host-local llama.cpp/GGUF optional; deterministic SAFE_FALLBACK always available',
    'Claim: digital OS integration only — not FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE',
  ].join('\n');
}
