import { CAPABILITY_MECHANISMS, mechanismFor } from '../../src/system-layer/capability_mechanisms';
import { ALL_SYSTEM_CAPABILITIES } from '../../src/system-layer/model_registry';
import { retrieveForQuery } from '../../src/system-layer/local_rag';

describe('Continuance IV capability mechanisms + local RAG', () => {
  it('registers a mechanism for every system capability', () => {
    expect(CAPABILITY_MECHANISMS.map((m) => m.capability).sort()).toEqual(
      [...ALL_SYSTEM_CAPABILITIES].sort(),
    );
    expect(mechanismFor('security').mechanism).toBe('deterministic');
    expect(mechanismFor('tutoring').usesLlamaCpp).toBe(true);
    expect(mechanismFor('rag').mechanism).toBe('local_rag_hybrid');
  });

  it('retrieves local RAG corpus docs for binary search queries', () => {
    const hits = retrieveForQuery('binary search tutoring fixture');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => /binary|search|tutor/i.test(h.id + h.text))).toBe(
      true,
    );
  });
});
