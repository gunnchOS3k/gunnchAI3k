import {
  LocalInferenceRuntimeAdapter,
  DeterministicBaselineBackend,
  LlamaCppBackend,
  OnnxRuntimeBackend,
} from '../../src/system-layer/local_inference';

describe('Continuance IV local_inference adapter', () => {
  const adapter = new LocalInferenceRuntimeAdapter();

  it('selects llama.cpp as architecture and probes without forced installs', () => {
    expect(adapter.selectedArchitecture).toBe('llama.cpp');
    const probes = adapter.probeAll();
    expect(probes.map((p) => p.id).sort()).toEqual(
      ['deterministic', 'llama.cpp', 'onnxruntime'].sort(),
    );
    const det = probes.find((p) => p.id === 'deterministic')!;
    expect(det.available).toBe(true);
    expect(det.installableWithoutAdmin).toBe(true);

    const llama = new LlamaCppBackend().probe();
    expect(llama.architecture).toBe('llama.cpp');
    expect(llama.installPathScript).toMatch(/install-llamacpp-path/);
    if (!llama.canRunRealInference) {
      expect(llama.metricsMode).toBe('placeholder_no_model');
      expect(llama.notes.join(' ')).toMatch(/SELECTED_ARCHITECTURE=llama\.cpp/);
    }
  });

  it('deterministic backend returns structured fields for new capabilities', async () => {
    const backend = new DeterministicBaselineBackend();
    for (const capability of [
      'a11y',
      'scientific',
      'translation',
      'workflow',
      'security',
    ] as const) {
      const result = await backend.infer({
        capability,
        query:
          capability === 'translation'
            ? 'en to es: hello'
            : `probe ${capability}`,
      });
      expect(result.isTrainedLlm).toBe(false);
      expect(result.structured.kind).toBe(capability);
      expect(result.latencyMs).toBeGreaterThan(0);
    }
  });

  it('llama.cpp falls back cleanly when unavailable with placeholders', async () => {
    const llama = new LlamaCppBackend();
    const l = await llama.infer({ capability: 'code', query: 'early return' });
    if (!llama.probe().canRunRealInference) {
      expect(l.fallbackUsed).toBe(true);
      expect(l.structured.metricsMode).toBe('placeholder_no_model');
      expect(l.structured.kind).toBe('code');
      expect(l.isTrainedLlm).toBe(false);
    }
  });

  it('onnxruntime remains non-primary probe with fallback', async () => {
    const onnx = new OnnxRuntimeBackend();
    const o = await onnx.infer({ capability: 'network', query: 'offline' });
    if (!onnx.probe().available) {
      expect(o.fallbackUsed).toBe(true);
      expect(o.structured.kind).toBe('network');
    }
  });

  it('wires RAG through existing local-runtime fixtures', async () => {
    const result = await adapter.infer({
      capability: 'rag',
      query: 'binary search tutoring fixture',
      preferredBackend: 'local-runtime-fixture',
      deviceProfileId: 'student_14_5',
    });
    expect(result.structured.kind).toBe('rag');
    expect(result.structured.localRuntimeOk).toBe(true);
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.grounded).toBe(true);
  });

  it('cloud stub never invents production keys', async () => {
    const result = await adapter.infer({
      capability: 'tutoring',
      query: 'anything',
      preferredBackend: 'cloud-policy-stub',
    });
    expect(result.structured.productionKeys).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.text).toMatch(/no production keys/i);
  });
});
