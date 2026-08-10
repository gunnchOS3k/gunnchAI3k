import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ProjectStore } from '../../src/stage2';

describe('stage2 projects', () => {
  it('Wireless Lab E2E create→files→ask→task→decision→restart→reopen', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-proj-'));
    const store = new ProjectStore(dir);
    const p = store.create('u1', 'Wireless Lab', 'Focus on OFDM and MIMO lab notes.');
    store.addFile('u1', p.id, {
      path: 'lab.pdf',
      kind: 'pdf',
      content: 'OFDM subcarriers and cyclic prefix overview',
    });
    store.addFile('u1', p.id, {
      path: 'sim.py',
      kind: 'code',
      content: 'def snr_db(p,n): return 10*log10(p/n)',
    });
    store.addFile('u1', p.id, {
      path: 'notes.md',
      kind: 'notes',
      content: 'Use Rayleigh fading for indoor trial',
    });
    const { answer } = store.askAi('u1', p.id, 'Summarize the lab focus');
    expect(answer).toContain('Wireless Lab');
    expect(answer).toMatch(/OFDM|Rayleigh/i);
    store.addTask('u1', p.id, 'Measure SNR floors');
    store.addDecision('u1', p.id, 'Use 15 kHz subcarrier spacing');
    const reopened = store.reopen('u1', p.id);
    expect(reopened?.name).toBe('Wireless Lab');
    expect(reopened?.files.length).toBe(3);
    expect(reopened?.tasks[0].title).toContain('SNR');
    expect(reopened?.decisions[0].summary).toContain('15 kHz');
    expect(reopened?.conversations.length).toBeGreaterThanOrEqual(2);
  });

  it('isolates two projects with no leakage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-iso-'));
    const store = new ProjectStore(dir);
    const a = store.create('u1', 'Alpha', 'alpha only');
    const b = store.create('u1', 'Beta', 'beta only');
    store.addFile('u1', a.id, { path: 'a.txt', kind: 'notes', content: 'SECRET_ALPHA_TOKEN_ZZ' });
    store.addFile('u1', b.id, { path: 'b.txt', kind: 'notes', content: 'SECRET_BETA_TOKEN_YY' });
    store.askAi('u1', a.id, 'what is in alpha?');
    store.assertIsolation('u1', a.id, b.id);
    const aView = store.get('u1', a.id)!;
    expect(JSON.stringify(aView)).not.toContain('SECRET_BETA_TOKEN_YY');
  });
});
