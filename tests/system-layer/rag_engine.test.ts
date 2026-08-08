import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { LocalRagEngine } from '../../src/system-layer/product_service/rag_engine';

describe('Continuance V LocalRagEngine', () => {
  let tmp: string;
  let engine: LocalRagEngine;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-rag-'));
    engine = new LocalRagEngine(process.cwd(), tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('ingests, chunks, indexes, searches, attributes, deletes, and rebuilds', () => {
    const doc = engine.ingestText({
      sourcePath: 'inline://demo.md',
      text: 'Binary search tutoring fixture for local RAG ranking and attribution.',
      corpus: 'custom',
      title: 'demo',
      docId: 'custom:demo',
    });
    expect(doc.chunkCount).toBeGreaterThan(0);
    expect(engine.index().chunks).toBeGreaterThan(0);

    const hits = engine.search('binary search tutoring', 3);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].attribution).toContain('custom:demo');

    const attr = engine.attribution('binary search tutoring', 3);
    expect(attr.grounded).toBe(true);
    expect(attr.attributionLines.length).toBeGreaterThan(0);

    expect(engine.delete('custom:demo')).toBe(true);
    expect(engine.search('binary search tutoring', 3).length).toBe(0);

    const stats = engine.rebuild();
    expect(stats.documents).toBeGreaterThan(3);
    expect(stats.corpora.device ?? 0).toBeGreaterThan(0);
    expect(stats.corpora.waike ?? 0).toBeGreaterThan(0);
    expect(stats.corpora.archive ?? 0).toBeGreaterThan(0);

    const deviceHits = engine.search('device storage boot local', 5);
    expect(deviceHits.some((h) => h.corpus === 'device')).toBe(true);
  });

  it('chunks long text with overlap metadata', () => {
    const chunks = engine.chunk('alpha '.repeat(200), 80, 20);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks[0].offset).toBe(0);
    expect(chunks[1].offset).toBeGreaterThan(0);
  });
});
