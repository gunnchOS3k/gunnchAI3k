import * as fs from 'node:fs';
import * as path from 'node:path';

describe('supervisor-facing README', () => {
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');

  it('does not present retired SSJ/doctoral marketing as current truth', () => {
    expect(readme).not.toMatch(/SSJ Infinity Achieved/i);
    expect(readme).not.toMatch(/doctoral-level intelligence/i);
    expect(readme).not.toMatch(/Additional Powers/i);
    expect(readme).not.toMatch(/Ready for Midterm Week/i);
    expect(readme).toMatch(/docs\/history/);
  });

  it('states local-first routing and honest frontier boundary', () => {
    expect(readme).toMatch(/Local-first intelligence/);
    expect(readme).toMatch(/GUNNCHAI_FRONTIER_PRODUCT_PARITY/);
    expect(readme).toMatch(/capability routing/i);
    expect(readme).toMatch(/npm run test:local-runtime/);
    expect(readme).toMatch(/npm run test:journeys/);
    expect(readme).toMatch(/Oulu affiliation/);
    expect(readme).not.toMatch(/accepted to Oulu/i);
  });
});
