import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalCorpusSearchProvider, ResearchEngine } from '../../src/stage2';

describe('stage2 citation integrity', () => {
  it('fails fabricated citations against controlled local sources', () => {
    const dir = path.join(process.cwd(), 'artifacts', 'stage2', 'research', 'corpus');
    fs.mkdirSync(dir, { recursive: true });
    const search = new LocalCorpusSearchProvider(dir);
    search.seed([
      {
        id: 'local-rf-001',
        title: 'Controlled RF note',
        text: 'Path loss increases with distance in free space.',
      },
    ]);
    const engine = new ResearchEngine(search);
    const src = search.fetchRead('local-rf-001')!;
    const evidence = engine.buildEvidence([src]);
    const synthesis = engine.synthesize(
      'path loss',
      [src],
      evidence,
      [
        { claim: 'real', source_id: 'local-rf-001', quote: 'Path loss increases' },
        { claim: 'fake', source_id: 'fabricated-999', quote: 'aliens boost SNR' },
        { claim: 'misquote', source_id: 'local-rf-001', quote: 'totally not in source' },
      ],
    );
    expect(synthesis.citations.some((c) => c.source_id === 'local-rf-001')).toBe(true);
    expect(synthesis.fabricated_rejected).toEqual(
      expect.arrayContaining(['fabricated-999', 'local-rf-001']),
    );
  });
});
