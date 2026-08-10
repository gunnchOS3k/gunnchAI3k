import http from 'node:http';
import {
  GunnchAiCapabilityApi,
  createIdentity,
  startCapabilityHttpServer,
  SyncInterface,
} from '../../src/stage2';

function postJson(port: number, p: string, body: unknown): Promise<any> {
  const data = Buffer.from(JSON.stringify(body));
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': data.length } },
      (res) => {
        let b = '';
        res.on('data', (c) => (b += c));
        res.on('end', () => resolve(JSON.parse(b)));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

describe('stage2 os integration smoke', () => {
  it('capability API routes via router with shared user_id', () => {
    const api = new GunnchAiCapabilityApi();
    const id = createIdentity('os_user_1');
    api.permissions.grant(id.user_id, 'memory');
    const caps = ['summarize', 'translate', 'tutor', 'code', 'reason', 'classify'] as const;
    for (const c of caps) {
      const r = api.invoke({
        capability: c,
        input: `please ${c}`,
        identity: id,
        telemetry: { availableRamMb: 4096, offline: false, batteryPercent: 70 },
      });
      expect(r.user_id).toBe('os_user_1');
      expect(r.ok).toBe(true);
      expect(r.route.selectedModelId).toBeTruthy();
      expect(r.sync.cloud_claimed).toBe(false);
    }
  });

  it('permission broker denies network search without grant', () => {
    const api = new GunnchAiCapabilityApi();
    const id = createIdentity('locked');
    expect(() =>
      api.invoke({ capability: 'search', input: 'q', identity: id }),
    ).toThrow(/PERMISSION_DENIED:network/);
  });

  it('resource-aware routing uses simulated OS telemetry', () => {
    const api = new GunnchAiCapabilityApi();
    const id = createIdentity('thermal');
    const r = api.invoke({
      capability: 'reason',
      input: 'heavy',
      identity: id,
      telemetry: { availableRamMb: 4096, batteryPercent: 5, thermalState: 'critical' },
    });
    expect(r.route.selectedRole === 'NANO_LOCAL' || r.ok === false).toBe(true);
  });

  it('HTTP adapter smoke for device-os callers', async () => {
    const api = new GunnchAiCapabilityApi();
    const server = await startCapabilityHttpServer(api, 0);
    try {
      const result = await postJson(server.port, '/v1/capability/tutor', {
        user_id: 'waike',
        input: 'teach MIMO',
        grant: ['memory'],
      });
      expect(result.ok).toBe(true);
      expect(result.user_id).toBe('waike');
    } finally {
      await server.close();
    }
  });

  it('sync interface stays local-default without fake cloud claim', () => {
    const sync = new SyncInterface();
    sync.recordLocalWrite();
    const st = sync.status('local_default');
    expect(st.cloud_claimed).toBe(false);
    expect(sync.enqueueCloudIfApproved(false).queued).toBe(false);
  });
});
