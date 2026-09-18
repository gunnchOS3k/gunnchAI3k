import * as fs from 'node:fs';
import * as path from 'node:path';
import { readFeatureFlags, isFeatureEnabled, FEATURE_FLAG_DEFAULTS } from '../../src/config/feature_flags';
import { isTaskAllowed, loadLiveProviderPolicy, clearPolicyCache } from '../../src/config/live_provider_policy';
import { startNearbyEdgeServer } from '../../src/nearby_edge/NearbyEdgeServer';
import { ControlledIntegrationRouter } from '../../src/nearby_edge/controlled_router';
import { buildProvenance } from '../../src/nearby_edge/ProvenanceEnvelope';
import { FixtureModelProvider } from '../../src/providers/model_provider_v2';
import { WAIKE_NEARBY_EDGE_CONTRACT_V1 } from '../../integrations/waike/nearby_edge_contract_v1';
import {
  CAPSULE_NEARBY_EDGE_CONTRACT_V1,
  capsuleIntegrationReady,
} from '../../integrations/gunnchos_capsule/nearby_edge_contract_v1';
import { runControlledIntegration } from '../../scripts/run_kirby_controlled_integration';

const ROOT = path.resolve(__dirname, '../..');

describe('Kirby controlled integration + nearby-edge (KIRBY-4)', () => {
  const prevLive = process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION;
  const prevEdge = process.env.GUNNCHAI_NEARBY_EDGE;

  afterEach(() => {
    if (prevLive === undefined) delete process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION;
    else process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION = prevLive;
    if (prevEdge === undefined) delete process.env.GUNNCHAI_NEARBY_EDGE;
    else process.env.GUNNCHAI_NEARBY_EDGE = prevEdge;
    clearPolicyCache();
  });

  test('feature flags default off', () => {
    delete process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION;
    delete process.env.GUNNCHAI_NEARBY_EDGE;
    expect(FEATURE_FLAG_DEFAULTS.GUNNCHAI_LIVE_PROVIDER_INTEGRATION).toBe(false);
    expect(FEATURE_FLAG_DEFAULTS.GUNNCHAI_NEARBY_EDGE).toBe(false);
    expect(isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION', {})).toBe(false);
    expect(isFeatureEnabled('GUNNCHAI_NEARBY_EDGE', {})).toBe(false);
    expect(readFeatureFlags({}).GUNNCHAI_NEARBY_EDGE).toBe(false);
  });

  test('policy allows earned micro tasks and denies exam dump; never production_default', () => {
    const policy = loadLiveProviderPolicy(ROOT);
    const p = policy.providers['smollm2-135m-instruct-q4_k_m'];
    expect(p.promotion_state).toBe('CONTROLLED_INTEGRATION');
    expect(p.production_default).toBe(false);
    expect(isTaskAllowed('smollm2-135m-instruct-q4_k_m', 'intent_route', ROOT).ok).toBe(true);
    expect(isTaskAllowed('smollm2-135m-instruct-q4_k_m', 'exam_answer_dump', ROOT).ok).toBe(false);
    expect(policy.gates_frozen_until_earned.PIXEL6A_LIVE_LOCAL_MODEL_PASS).toBe(false);
    expect(policy.gates_frozen_until_earned.PRODUCTION_DEFAULT_PROVIDER_FROZEN).toBe(false);
  });

  test('controlled promotion doc exists and forbids production default', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/frontier/CONTROLLED_PROVIDER_PROMOTION.md'), 'utf8');
    expect(doc).toContain('CONTROLLED_INTEGRATION');
    expect(doc).toMatch(/not.*PRODUCTION_DEFAULT|Forbidden until earned/i);
    expect(doc).toContain('GUNNCHAI_NEARBY_EDGE');
  });

  test('pairing protocol docs prefer ADB_REVERSE and forbid open LAN', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/frontier/NEARBY_EDGE_PAIRING_PROTOCOL.md'), 'utf8');
    expect(doc).toContain('ADB_REVERSE');
    expect(doc).toMatch(/Unauthenticated LAN|forbid/i);
    expect(doc).toContain('/v1/execute');
  });

  test('waike and capsule nearby-edge contracts present', () => {
    expect(WAIKE_NEARBY_EDGE_CONTRACT_V1.on_device_local).toBe(false);
    expect(WAIKE_NEARBY_EDGE_CONTRACT_V1.preferred_transport).toBe('ADB_REVERSE');
    expect(CAPSULE_NEARBY_EDGE_CONTRACT_V1.production_default_provider).toBe(false);
    expect(capsuleIntegrationReady().wired_into_product).toBe(false);
  });

  test('provenance envelope never claims on-device local', () => {
    const env = buildProvenance({
      transport: 'ADB_REVERSE',
      model_id: 'smollm2-135m-instruct-q4_k_m',
      provider_id: 'prov_llamacpp_live',
      task_class: 'intent_route',
    });
    expect(env.on_device_local).toBe(false);
    expect(env.adb_reverse_is_not_on_device).toBe(true);
    expect(env.production_default).toBe(false);
    expect(env.device_role).toBe('pixel6a_adb_client');
  });

  test('nearby-edge server rejects unauthenticated execute and requires flags', async () => {
    process.env.GUNNCHAI_NEARBY_EDGE = '1';
    process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION = '1';
    const fixture = new FixtureModelProvider({
      provider_id: 'prov_fixture',
      model_id: 'fixture-always',
      display_name: 'fixture',
      family: 'fixture',
      location: 'local',
      tier_hint: 0,
      context_window_tokens: 1024,
      max_output_tokens: 64,
      modalities: ['text'],
      supports_tools: false,
      supports_structured_output: false,
      supports_streaming: false,
      supports_computer_use: false,
      offline_capable: true,
      requires_cloud_consent: false,
      cost_per_1k_input_usd: 0,
      cost_per_1k_output_usd: 0,
      typical_latency_ms: 10,
      energy_hint_j_per_1k: 0.01,
      health: 'healthy',
      privacy_class: 'device_local',
      hidden_cot_exposed: false,
      notes: 'test',
    });
    // Gateway expects smollm2 policy model — use null provider for deny paths
    const server = await startNearbyEdgeServer({ provider: null, root: ROOT, transport: 'LOCALHOST' });
    const unauth = await fetch(`${server.url}/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_class: 'short_assist', prompt: 'x' }),
    });
    expect(unauth.status).toBe(401);

    const { code } = server.mintPairingCode();
    const pair = await fetch(`${server.url}/v1/session/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, client_label: 'test' }),
    });
    const pairBody = (await pair.json()) as { session_token: string };
    const deny = await fetch(`${server.url}/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pairBody.session_token}`,
      },
      body: JSON.stringify({ task_class: 'exam_answer_dump', prompt: 'dump' }),
    });
    expect(deny.status).toBe(403);
    await server.close();
    void fixture;
  });

  test('router has no behavior change when flags off', async () => {
    delete process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION;
    delete process.env.GUNNCHAI_NEARBY_EDGE;
    const router = new ControlledIntegrationRouter();
    const r = await router.executeControlled({ task_class: 'short_assist', prompt: 'hi' });
    expect(r.error).toBe('FEATURE_FLAGS_OFF');
    expect(r.selected).toBe('deterministic');
  });

  test(
    'end-to-end controlled integration writes artifacts and keeps unearned gates false',
    async () => {
      const result = await runControlledIntegration(ROOT);
      const required = [
        'flags/DEFAULT_OFF.json',
        'policy/live_provider_policy.snapshot.json',
        'nearby_edge/SERVER_START.json',
        'security/THREAT_CASES.json',
        'privacy/LABELS.json',
        'fallback/FALLBACK_MATRIX.json',
        'lifecycle/ROLLBACK.json',
        'pixel_journey/JOURNEY_LOG.json',
        'gates/GATE_SUMMARY.json',
        'CONTROLLED_SUMMARY.json',
        'resource/MAC_8GB_GUARD.json',
      ];
      for (const f of required) {
        expect(fs.existsSync(path.join(result.outDir, f))).toBe(true);
      }
      expect(result.gates.PIXEL6A_LIVE_LOCAL_MODEL_PASS).toBe(false);
      expect(result.gates.GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS).toBe(false);
      expect(result.gates.PRODUCTION_DEFAULT_PROVIDER_FROZEN).toBe(false);
      expect(result.nextAction).toContain('INTEGRATE_NEARBY_EDGE_PROVIDER_INTO_GUNNCHOS_CAPSULE');
      expect(fs.existsSync(path.join(ROOT, 'pilot/nearby_edge_pwa/index.html'))).toBe(true);
    },
    300_000,
  );
});
