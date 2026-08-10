import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GunnchMemoryStore, encryptPayload, decryptPayload } from '../../src/stage2';

describe('stage2 gunnchMemory controls', () => {
  let dir: string;
  let store: GunnchMemoryStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-mem-'));
    store = new GunnchMemoryStore(dir, 'user-secret-key');
  });

  it('encrypts round-trip', () => {
    const tok = encryptPayload('hello', 'k');
    expect(decryptPayload(tok, 'k')).toBe('hello');
    expect(() => decryptPayload(tok, 'wrong')).toThrow();
  });

  it('supports domains and full control surface', () => {
    const domains = ['USER', 'PROJECT', 'LEARNING', 'DEVICE', 'WORK'] as const;
    for (const d of domains) {
      store.write({ owner: 'u1', domain: d, type: 'note', content: `${d} data`, project_scope: d === 'PROJECT' ? 'p1' : null });
    }
    expect(store.list('u1').length).toBe(5);
    const hit = store.search('u1', 'LEARNING')[0];
    expect(store.inspect('u1', hit.id)?.domain).toBe('LEARNING');
    store.edit('u1', hit.id, { content: 'LEARNING updated' });
    store.pause('u1', hit.id);
    expect(store.list('u1').find((r) => r.id === hit.id)).toBeUndefined();
    const exported = store.export('u1');
    expect(exported.length).toBeGreaterThan(0);
    const proj = store.write({
      owner: 'u1',
      domain: 'PROJECT',
      type: 'scratch',
      content: 'proj only',
      project_scope: 'clear-me',
    });
    expect(store.clearProject('u1', 'clear-me')).toBeGreaterThanOrEqual(1);
    expect(store.inspect('u1', proj.id)).toBeNull();
    store.delete('u1', exported[0].id);
    store.disableMemory();
    expect(() => store.write({ owner: 'u1', domain: 'USER', type: 'x', content: 'nope' })).toThrow(/MEMORY_DISABLED/);
  });

  it('resolves dark→light preference contradiction', () => {
    store.write({ owner: 'u1', domain: 'USER', type: 'preference', content: 'pref:theme=dark' });
    store.resolvePreferenceContradiction('u1', 'theme', 'light');
    const prefs = store.search('u1', 'pref:theme');
    expect(prefs).toHaveLength(1);
    expect(prefs[0].content).toContain('light');
  });

  it('persists under artifacts/stage2/memory style path', () => {
    const art = path.join(process.cwd(), 'artifacts', 'stage2', 'memory', 'test-run');
    fs.rmSync(art, { recursive: true, force: true });
    const s = new GunnchMemoryStore(art, 'k');
    const r = s.write({ owner: 'u1', domain: 'USER', type: 'note', content: 'artifact path' });
    expect(fs.existsSync(path.join(art, `${r.id}.enc`))).toBe(true);
  });
});
