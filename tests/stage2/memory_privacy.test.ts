import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GunnchMemoryStore } from '../../src/stage2';

describe('stage2 memory privacy', () => {
  it('blocks cross-user and cross-project leakage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-priv-'));
    const store = new GunnchMemoryStore(dir, 'k');
    store.write({ owner: 'alice', domain: 'USER', type: 'note', content: 'alice secret' });
    store.write({
      owner: 'alice',
      domain: 'PROJECT',
      type: 'note',
      content: 'projA',
      project_scope: 'A',
    });
    store.write({
      owner: 'alice',
      domain: 'PROJECT',
      type: 'note',
      content: 'projB',
      project_scope: 'B',
    });
    store.write({ owner: 'bob', domain: 'USER', type: 'note', content: 'bob secret' });
    expect(store.list('alice').every((r) => r.owner === 'alice')).toBe(true);
    expect(store.inspect('bob', store.list('alice')[0].id)).toBeNull();
    store.assertNoCrossUserLeak('alice', 'bob');
    store.assertNoCrossProjectLeak('alice', 'A', 'B');
  });

  it('deleted memories do not reappear via default import', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-del-'));
    const store = new GunnchMemoryStore(dir, 'k');
    const r = store.write({ owner: 'u1', domain: 'USER', type: 'note', content: 'temp' });
    const snap = store.export('u1');
    store.delete('u1', r.id);
    expect(store.wasDeleted(r.id)).toBe(true);
    const imported = store.import('u1', snap);
    expect(imported).toBe(0);
    expect(store.inspect('u1', r.id)).toBeNull();
  });

  it('rejects cloud sync without permission', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnch-cloud-'));
    const store = new GunnchMemoryStore(dir, 'k');
    const local = store.write({
      owner: 'u1',
      domain: 'USER',
      type: 'note',
      content: 'local',
      sync_policy: 'local_only',
    });
    expect(store.requestCloudSync('u1', local.id, true).ok).toBe(false);
    const syncable = store.write({
      owner: 'u1',
      domain: 'USER',
      type: 'note',
      content: 'maybe',
      sync_policy: 'user_approved_sync',
    });
    expect(store.requestCloudSync('u1', syncable.id, false).reason).toBe('cloud_without_permission');
  });
});
