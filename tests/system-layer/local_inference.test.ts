import {
  LocalInferenceRuntimeAdapter,
  DeterministicBaselineBackend,
  LlamaCppBackend,
  OnnxRuntimeBackend,
} from '../../src/system-layer/local_inference';

describe('Wave C local_inference adapter', () => {
  const adapter = new LocalInferenceRuntimeAdapter();

  it('probes backends without requiring admin installs', () => {
    const probes = adapter.probeAll();
    expect(probes.map((p) => p.id).sort()).toEqual(
      ['deterministic', 'llama.cpp', 'onnxruntime'].sort(),
    );
    const det = probes.find((p) => p.id === 'deterministic')!;
    expect(det.available).toBe(true);
    expect(det.installableWithoutAdmin).toBe(true);

    const llama = probes.find((p) => p.id === 'llama.cpp')!;
    const onnx = probes.find((p) => p.id === 'onnxruntime')!;
    // On this CI host they are typically unavailable; adapter must still be honest.
    if (!llama.available) {
      expect(llama.installableWithoutAdmin).toBe(false);
      expect(llama.notes.join(' ')).toMatch(/not download|No llama|no llama/i);
    }
    if (!onnx.available) {
      expect(onnx.installableWithoutAdmin).toBe(false);
    }
  });

  it('deterministic backend returns structured fields (not text-only)', async () => {
    const backend = new DeterministicBaselineBackend();
    const result = await backend.infer({
      capability: 'tutoring',
      query: 'teach binary search',
    });
    expect(result.isTrainedLlm).toBe(false);
    expect(result.structured.concept).toBeTruthy();
    expect(Array.isArray(result.structured.steps)).toBe(true);
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.memoryStubBytes).toBeGreaterThan(0);
  });

  it('llama.cpp and onnxruntime fall back cleanly when unavailable', async () => {
    const llama = new LlamaCppBackend();
    const onnx = new OnnxRuntimeBackend();
    const l = await llama.infer({ capability: 'code', query: 'early return' });
    const o = await onnx.infer({ capability: 'network', query: 'offline' });
    if (!llama.probe().available) {
      expect(l.fallbackUsed).toBe(true);
      expect(l.structured.kind).toBe('code');
    }
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
