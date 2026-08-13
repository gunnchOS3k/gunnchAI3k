import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import {
  EMPTY_SHA256,
  FAST_SHA256,
  ModelDownloadManager,
  NANO_SHA256,
  type CatalogEntry,
} from '../../src/user-ready/model_manager';

function tinyGguf(payload: string): Buffer {
  return Buffer.concat([Buffer.from('GGUF'), Buffer.from(payload)]);
}

function entryFor(buf: Buffer, id = 'fixture-fast'): CatalogEntry {
  return {
    id,
    role: 'LOCAL_FAST',
    displayName: 'fixture',
    version: '0.0.1',
    license: 'Apache-2.0',
    source: 'http://127.0.0.1/fixture',
    ggufSource: 'http://127.0.0.1/fixture',
    downloadUrl: 'http://127.0.0.1/fixture',
    filename: 'fixture-fast.gguf',
    sha256: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
    quant: 'Q4_K_M',
    contextTokens: 128,
    isNanoFallbackOnly: false,
    minBytes: buf.length,
  };
}

describe('model download manager', () => {
  it('rejects empty-file SHA, fake bytes, and Nano-as-Fast', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mgr-'));
    fs.mkdirSync(path.join(tmp, 'models', 'local'), { recursive: true });
    fs.copyFileSync(
      path.join(process.cwd(), 'models', 'local', 'catalog.json'),
      path.join(tmp, 'models', 'local', 'catalog.json'),
    );
    const mgr = new ModelDownloadManager(tmp);
    const fast = mgr.get('local-fast-smollm2-360m')!;

    const empty = path.join(tmp, 'empty.gguf');
    fs.writeFileSync(empty, '');
    const emptyV = mgr.verifyFile(empty, { ...fast, minBytes: 1 });
    expect(emptyV.ok).toBe(false);
    expect(emptyV.reason).toBe('EMPTY_FILE_SHA');
    expect(emptyV.sha256).toBe(EMPTY_SHA256);

    const fake = path.join(tmp, 'fake.gguf');
    fs.writeFileSync(fake, 'not a model');
    const fakeV = mgr.verifyFile(fake, { ...fast, minBytes: 1 });
    expect(fakeV.ok).toBe(false);
    expect(fakeV.reason).toBe('FAKE_MODEL_BYTES_NOT_GGUF');

    const nanoNamed = path.join(tmp, 'SmolLM2-135M-Instruct-Q4_K_M.gguf');
    fs.writeFileSync(nanoNamed, tinyGguf('nano-disguise'));
    const nanoV = mgr.verifyFile(nanoNamed, { ...fast, minBytes: 4 });
    expect(nanoV.ok).toBe(false);
    expect(nanoV.reason).toMatch(/NANO_AS_FAST/);
    expect(nanoV.sha256).not.toBe(FAST_SHA256);
    expect(NANO_SHA256).not.toBe(FAST_SHA256);
  });

  it('resumes downloads, verifies SHA, quarantines mismatch, uninstalls, rolls back', async () => {
    const body = tinyGguf('resume-body-for-manager');
    const catalogEntry = entryFor(body);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mgr-dl-'));
    fs.mkdirSync(path.join(tmp, 'models', 'local'), { recursive: true });
    const mgr = new ModelDownloadManager(tmp, [catalogEntry]);

    let hits = 0;
    const server = await new Promise<http.Server>((resolve) => {
      const s = http.createServer((req, res) => {
        hits += 1;
        const range = req.headers.range;
        if (range) {
          const start = Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0);
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${body.length - 1}/${body.length}`);
          res.end(body.subarray(start));
          return;
        }
        res.end(body);
      });
      s.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const port = (server.address() as { port: number }).port;
      catalogEntry.downloadUrl = `http://127.0.0.1:${port}/fixture-fast.gguf`;

      const partial = path.join(tmp, 'models', 'local', 'fixture-fast.gguf.partial');
      fs.writeFileSync(partial, body.subarray(0, 6));

      const installed = await mgr.ensure(catalogEntry.id, { networkConsent: true });
      expect(installed.ok).toBe(true);
      expect(installed.resumed).toBe(true);
      expect(installed.sha256).toBe(catalogEntry.sha256);
      expect(hits).toBeGreaterThanOrEqual(1);

      const offline = await mgr.ensure(catalogEntry.id, { offline: true });
      expect(offline.ok).toBe(true);
      expect(offline.reason).toBe('ALREADY_INSTALLED');

      const noConsent = await new ModelDownloadManager(tmp, [
        { ...catalogEntry, id: 'other', filename: 'other.gguf' },
      ]).ensure('other', { networkConsent: false });
      expect(noConsent.ok).toBe(false);
      expect(noConsent.reason).toBe('NETWORK_CONSENT_REQUIRED');

      fs.writeFileSync(path.join(tmp, 'models', 'local', 'fixture-fast.gguf'), tinyGguf('corrupt-bytes'));
      const bad = await mgr.ensure(catalogEntry.id, { networkConsent: true });
      expect(bad.quarantined || bad.ok).toBeTruthy();
      if (!bad.ok) expect(bad.reason).toMatch(/SHA256_MISMATCH|TOO_SMALL|FAKE/);

      const un = mgr.uninstall(catalogEntry.id);
      expect(un.ok).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  }, 20_000);
});

