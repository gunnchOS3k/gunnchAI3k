import * as path from 'node:path';
import { LongContextEngine } from '../../src/phase_xiv';

describe('phase_xiv long context', () => {
  it('retrieves/summarizes with honest supported tokens and null claimed tokens', () => {
    const root = path.join(process.cwd(), 'artifacts', 'phase_xiv', 'eval', 'long_context');
    const eng = new LongContextEngine(root, 8192);
    eng.ingest('p1', [
      { source: 'a', text: 'Rayleigh fading and SNR measurement notes for lab.' },
      { source: 'b', text: 'Unrelated cooking recipe with pasta.' },
    ]);
    const out = eng.assemble('p1', 'SNR fading lab', 'direct preface');
    expect(out.chunks[0].text.toLowerCase()).toContain('rayleigh');
    expect(out.claimed_context_tokens).toBeNull();
    expect(out.supported_context_tokens).toBe(8192);
    expect(out.notes.join(' ')).toMatch(/No unsupported million-token/i);
  });
});
