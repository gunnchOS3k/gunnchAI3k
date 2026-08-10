import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { LocalCorpusSearchProvider, ResearchEngine } from '../../src/stage2';

describe('stage2 research foundation', () => {
  it('offline local-only marks web unavailable', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-res-'));
    const search = new LocalCorpusSearchProvider(dir);
    search.seed([
      { id: 'src1', title: 'MIMO basics', text: 'Spatial multiplexing increases throughput.' },
      { id: 'src2', title: 'OFDM primer', text: 'Orthogonal subcarriers resist multipath.' },
    ]);
    const engine = new ResearchEngine(search);
    const run = engine.runOffline('OFDM multipath');
    expect(run.plan.offline).toBe(true);
    expect(run.plan.web_unavailable).toBe(true);
    expect(run.sources.length).toBeGreaterThan(0);
    expect(run.evidence.length).toBeGreaterThan(0);
    expect(run.synthesis.answer).toContain('OFDM');
  });
});
