import * as http from 'node:http';
import { DeepResearchRuntime } from '../../src/user-ready/deep_research';

function serve(pages: Record<string, string>): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const body = pages[req.url ?? ''];
      if (!body) {
        res.statusCode = 404;
        res.end('missing');
        return;
      }
      res.setHeader('content-type', 'text/html');
      res.end(`<html><title>${req.url}</title><body>${body}</body></html>`);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        port,
        close: () =>
          new Promise((res, rej) => {
            server.close((e) => (e ? rej(e) : res()));
          }),
      });
    });
  });
}

describe('AI-UR-007 consent-gated Deep Research', () => {
  it('blocks fetch without consent and does not silently use cloud', async () => {
    const dr = new DeepResearchRuntime();
    const report = await dr.run({
      question: 'OFDM cyclic prefix',
      seedUrls: ['http://127.0.0.1:9/a', 'http://127.0.0.1:9/b'],
      consent: { network: false, cloud: false, discloseDataLeavesDevice: false },
    });
    expect(report.ok).toBe(false);
    expect(report.sourcesFetched).toBe(0);
    expect(report.cloudUsed).toBe(false);
    expect(report.notes).toMatch(/CONSENT_REQUIRED/);
  });

  it('requires multiple sources; one URL is not Deep Research', async () => {
    const dr = new DeepResearchRuntime();
    dr.grantNetwork();
    const report = await dr.run({
      question: 'OFDM',
      seedUrls: ['http://example.invalid/only-one'],
      consent: { network: true, cloud: false, discloseDataLeavesDevice: true },
    });
    expect(report.ok).toBe(false);
    expect(report.notes).toMatch(/SINGLE_SEARCH_REJECTED/);
  });

  it('fetches multiple live sources, cites only read bodies, represents contradiction, rejects invented URLs', async () => {
    const server = await serve({
      '/a': 'WAIKE orange dock is the fidelity marker on the handheld chrome.',
      '/b': 'WAIKE orange dock is not an air-interface standard.',
      '/c': 'OFDM cyclic prefix absorbs delay spread so subcarriers stay orthogonal.',
      '/unread': 'This page exists but the agent must not cite it if unread.',
    });
    try {
      const base = `http://127.0.0.1:${server.port}`;
      const dr = new DeepResearchRuntime();
      dr.grantNetwork();
      const report = await dr.run({
        question: 'WAIKE orange dock versus OFDM cyclic prefix',
        seedUrls: [`${base}/a`, `${base}/b`, `${base}/c`],
        consent: { network: true, cloud: false, discloseDataLeavesDevice: true },
        fakeUrl: 'https://invented.example.invalid/paper-999',
      });
      expect(report.ok).toBe(true);
      expect(report.sourcesRead).toBeGreaterThanOrEqual(2);
      expect(report.citations.filter((c) => c.verified).length).toBeGreaterThanOrEqual(2);
      for (const c of report.citations) {
        expect(c.verified).toBe(true);
        expect(c.url).not.toContain('invented.example');
        expect(c.url).not.toContain('/unread');
      }
      expect(report.unreadCited).toEqual([]);
      expect(report.fabricatedRejected).toContain('https://invented.example.invalid/paper-999');
      expect(report.contradictions.length).toBeGreaterThanOrEqual(1);
      expect(report.cloudUsed).toBe(false);
      expect(report.plan.steps.length).toBeGreaterThanOrEqual(4);
      expect(report.answer).toMatch(/Citations:/);
    } finally {
      await server.close();
    }
  });
});
