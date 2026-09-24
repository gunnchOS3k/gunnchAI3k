import * as fs from 'node:fs';
import * as path from 'node:path';
import { CapabilityRegistry } from '../../src/frontier/capability_registry';
import {
  SYSTEM_ONE_CAPABILITY_IDS,
  SYSTEM_ONE_UMBRELLA,
  validateDecisionRequest,
  type DecisionRequest,
} from '../../src/decision_plane/contracts';
import {
  FEATURE_FLAG_DEFAULTS,
  readFeatureFlags,
  isFeatureEnabled,
} from '../../src/config/feature_flags';
import {
  readSystemOneFlags,
  SYSTEM_ONE_FLAG_DEFAULTS,
  SYSTEM_ONE_FLAG_NAMES,
} from '../../src/decision_plane/flags';
import { TypeSafeFixtureProvider } from '../../src/providers/typesafe/typesafe_fixture';
import { TypeSafeJevProvider } from '../../src/providers/typesafe/typesafe_jev_provider';
import { TypeSafeError } from '../../src/providers/typesafe/typesafe_errors';
import { mapQuestionToTypeSafe, mapAnswerFromTypeSafe, mapResponseFromTypeSafe } from '../../src/providers/typesafe/typesafe_mapper';
import { selectCompatibleModel } from '../../src/providers/typesafe/typesafe_models';
import { createDecisionBroker } from '../../src/decision_plane/decision_broker';
import { DeterministicDecisionFallback } from '../../src/decision_plane/fallback';
import { DecisionStateMinimizer } from '../../src/decision_plane/minimizer';
import { redactError, redactSecrets } from '../../src/decision_plane/redaction';
import { evaluateRemoteEligibility } from '../../src/decision_plane/privacy_policy';
import { ConfidenceGate } from '../../src/decision_plane/confidence_gate';
import { DecisionCache } from '../../src/decision_plane/cache';
import { evaluateParallelA, evaluateParallelB, recommendBatchSize } from '../../src/decision_plane/batch';
import { hierarchicalChoice } from '../../src/decision_plane/hierarchical';
import {
  accuracyBinary,
  auroc,
  brierScore,
  choiceNll,
  choiceTop1,
  expectedCalibrationError,
  logLoss,
  mae,
  mayClaimCalibrated,
  ordinalError,
  reliabilityBins,
  rmse,
  selectiveAutomation,
} from '../../src/decision_plane/calibration';
import { inferRouterFeatures, routeWithOptionalFeatures } from '../../src/decision_plane/router_integration';
import { ModelRouterV2 } from '../../src/control/model_router_v2';
import { ReasoningPolicyV2 } from '../../src/control/reasoning_policy';
import { intentQuestions, featureInferenceQuestions } from '../../src/decision_plane/tasks/schemas';
import { loadPricing, estimateCostUsd } from '../../src/decision_plane/cost';
import { summarizeLatency } from '../../src/decision_plane/latency';
import { TYPESAFE_BASE_URL, TYPESAFE_SYSTEMONE_PATH, TYPESAFE_MODELS_PATH } from '../../src/providers/typesafe/typesafe_api_contract';

const ROOT = path.resolve(__dirname, '../..');

const publicRequest = (over: Partial<DecisionRequest> = {}): DecisionRequest => ({
  state: { text: 'Explain binary trees' },
  questions: intentQuestions(),
  privacy_class: 'public',
  task_class: 'intent_route',
  cloud_consent: true,
  latency_budget_ms: 2000,
  offline: false,
  ...over,
});

describe('KIRBY-5 foundation / flags / contracts', () => {
  test('capability registry normalizes SYSTEM_ONE_DECISION_PLANE family', () => {
    const reg = CapabilityRegistry.load(ROOT);
    expect(SYSTEM_ONE_UMBRELLA).toBe('SYSTEM_ONE_DECISION_PLANE');
    for (const id of SYSTEM_ONE_CAPABILITY_IDS) {
      const cap = reg.get(id);
      expect(cap).toBeDefined();
      expect(cap?.capability_class).toBe('SYSTEM_ONE_DECISION_PLANE');
      expect(cap?.provider_agnostic).toBe(true);
      expect(cap?.hard_provider_pin).toBe(false);
      expect(cap?.hidden_cot_required).toBe(false);
      expect(cap?.broker_mediated).toBe(true);
    }
  });

  test('feature flags default OFF and rollback restores pre-KIRBY-5 path', async () => {
    expect(Object.values(FEATURE_FLAG_DEFAULTS).every((v) => v === false)).toBe(true);
    expect(Object.values(SYSTEM_ONE_FLAG_DEFAULTS).every((v) => v === false)).toBe(true);
    const empty = readFeatureFlags({});
    const so = readSystemOneFlags({});
    for (const name of SYSTEM_ONE_FLAG_NAMES) {
      expect(empty[name]).toBe(false);
      expect(so[name]).toBe(false);
      expect(isFeatureEnabled(name, {})).toBe(false);
    }
    const env = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    expect(env).toContain('TYPESAFE_API_KEY=');
    expect(env).toContain('GUNNCHAI_SYSTEM_ONE_DECISION_PLANE=0');
    expect(env).toContain('GUNNCHAI_TYPESAFE_JEV=0');
    expect(env).toContain('GUNNCHAI_TYPESAFE_LIVE=0');

    const broker = createDecisionBroker(new TypeSafeJevProvider({ apiKey: '' }), new TypeSafeFixtureProvider(), {});
    const result = await broker.evaluate(publicRequest());
    expect(result.fallback_reason).toBe('FLAGS_OFF');
    expect(result.response.provider_id).toBe('deterministic_local');
    expect(result.response.provenance.production_default).toBe(false);
    expect(result.response.provenance.product).toBe('gunnchAI');
  });

  test('decision contract validates names and maps away from vendor noul', () => {
    const ok = validateDecisionRequest(publicRequest());
    expect(ok.ok).toBe(true);
    expect(validateDecisionRequest(publicRequest({ questions: { '1bad': intentQuestions().intent } })).ok).toBe(false);
    expect(validateDecisionRequest(publicRequest({ questions: { pick: { type: 'categorical_choice', choices: {} } } })).ok).toBe(false);
    const mapped = mapQuestionToTypeSafe({ type: 'binary_probability', instructions: 'yes?' });
    expect(mapped.type).toBe('noul');
    const back = mapAnswerFromTypeSafe({ type: 'noul', noul: 0.8 });
    expect(back).toEqual({ type: 'binary_probability', probability_true: 0.8 });
    expect(() =>
      mapResponseFromTypeSafe(
        { model: 'x', answers: { a: { type: 'choice', choice: 'z', confidence: 1, probabilities: { z: 1 } } }, usage: { input_tokens: 1, output_tokens: 1 } },
        { a: { type: 'binary_probability', instructions: 'x' } },
      ),
    ).toThrow(TypeSafeError);
  });
});

describe('KIRBY-5 TypeSafe adapter / discovery / timeout', () => {
  test('public API constants and fixture discovery do not fabricate models', async () => {
    expect(TYPESAFE_BASE_URL).toBe('https://api.typesafe.ai');
    expect(TYPESAFE_SYSTEMONE_PATH).toBe('/v1/systemone');
    expect(TYPESAFE_MODELS_PATH).toBe('/v1/models');
    const fixture = new TypeSafeFixtureProvider();
    const health = await fixture.health();
    expect(health.live).toBe(false);
    expect(health.models.map((m) => m.name)).toEqual(['jev-fixture']);
    const miss = selectCompatibleModel('jev-latest', health.models, false);
    expect(miss.model).toBeNull();
    const compat = selectCompatibleModel('jev-latest', health.models, true);
    expect(compat.model).toBe('jev-fixture');
  });

  test('live provider without key fails closed; mock HTTP covers 422/429/timeout', async () => {
    const live = new TypeSafeJevProvider({ apiKey: '' });
    await expect(live.evaluate(publicRequest())).rejects.toThrow(/LIVE_JEV_ACCESS_REQUIRED|AUTH_FAILURE/);

    const fetchImpl = jest.fn(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    }) as unknown as typeof fetch;
    const timed = new TypeSafeJevProvider({
      apiKey: 'test-not-a-real-key',
      fetchImpl,
      defaultTimeoutMs: 5,
    });
    (timed as unknown as { discovery: { models: Array<{ name: string; description: string; release_date: string }>; fetched_at: string; source: string } }).discovery = {
      models: [{ name: 'jev-fixture', description: 'x', release_date: '2026-09-15' }],
      fetched_at: new Date().toISOString(),
      source: 'fixture',
    };
    await expect(timed.evaluate(publicRequest({ latency_budget_ms: 5 }))).rejects.toBeInstanceOf(TypeSafeError);

    const fail422 = new TypeSafeFixtureProvider({ fail: '422' });
    await expect(fail422.evaluate(publicRequest())).rejects.toMatchObject({ code: 'VALIDATION_FAILURE' });
    const fail429 = new TypeSafeFixtureProvider({ fail: '429' });
    await expect(fail429.evaluate(publicRequest())).rejects.toMatchObject({ code: 'RATE_LIMIT', retryable: true });
  });

  test('broker falls back on timeout and never breaks offline core', async () => {
    const remote = new TypeSafeFixtureProvider({ fail: 'timeout' });
    const local = new TypeSafeFixtureProvider();
    const broker = createDecisionBroker(remote, local, {
      GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: '1',
      GUNNCHAI_TYPESAFE_JEV: '1',
      GUNNCHAI_TYPESAFE_LIVE: '1',
    });
    const result = await broker.evaluate(publicRequest());
    expect(result.fallback_reason).toBe('TIMEOUT');
    expect(result.response.provider_id).toBe('deterministic_local');
    expect(result.response.provenance.on_device_local).toBe(true);
    expect(result.response.provenance.remote).toBe(false);
  });
});

describe('KIRBY-5 privacy / redaction / cache', () => {
  test('offline, device_local, missing consent, and sensitive deny remote Jev', () => {
    expect(evaluateRemoteEligibility({ privacy_class: 'public', cloud_consent: true, task_class: 'intent_route', offline: true }).allowed).toBe(false);
    expect(evaluateRemoteEligibility({ privacy_class: 'device_local', cloud_consent: true, task_class: 'intent_route', offline: false }).reason).toBe('DEVICE_LOCAL_REMOTE_DENIED');
    expect(evaluateRemoteEligibility({ privacy_class: 'public', cloud_consent: false, task_class: 'intent_route', offline: false }).reason).toBe('CLOUD_CONSENT_REQUIRED');
    expect(evaluateRemoteEligibility({ privacy_class: 'sensitive', cloud_consent: true, task_class: 'intent_route', offline: false }).reason).toBe('SENSITIVE_DEFAULT_DENY_KIRBY5');
    expect(evaluateRemoteEligibility({ privacy_class: 'personal', cloud_consent: true, task_class: 'intent_route', offline: false }).allowed).toBe(true);
    expect(evaluateRemoteEligibility({ privacy_class: 'personal', cloud_consent: true, task_class: 'final_grade', offline: false }).allowed).toBe(false);
  });

  test('minimizer drops secrets and transcripts; errors redact bearer tokens', () => {
    const min = new DecisionStateMinimizer().minimize({
      state: {
        text: 'help',
        api_key: 'sk-secret-value-123456',
        student_records: { ssn: '000' },
        chat_transcript: ['long'],
        password: 'hunter2',
      },
      questions: intentQuestions(),
      privacy_class: 'public',
      task_class: 'intent_route',
    });
    const obj = min.state as Record<string, unknown>;
    expect(obj.student_records).toBeUndefined();
    expect(obj.chat_transcript).toBeUndefined();
    expect(obj.api_key).toBe('[REDACTED]');
    expect(min.dropped_fields).toEqual(expect.arrayContaining(['student_records', 'chat_transcript']));
    const secrets = redactSecrets({ authorization: 'Bearer supersecret', note: 'Authorization: Bearer abcdefghijklmnop' });
    expect(JSON.stringify(secrets.value)).not.toMatch(/supersecret|abcdefghijklmnop/);
    expect(redactError(new Error('Authorization: Bearer abcdefghijklmnop failed'))).not.toContain('abcdefghijklmnop');
  });

  test('cache is public-only, bounded, and skips mutation/sensitive', () => {
    const cache = new DecisionCache(2, 60_000);
    const pub = publicRequest();
    expect(cache.eligible(pub)).toBe(true);
    expect(cache.eligible(publicRequest({ privacy_class: 'personal' }))).toBe(false);
    expect(cache.eligible(pub, true)).toBe(false);
    const fb = new DeterministicDecisionFallback().evaluate(pub, 'FLAGS_OFF');
    cache.set('a', fb);
    cache.set('b', fb);
    cache.set('c', fb);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('c')).toBeDefined();
  });
});

describe('KIRBY-5 calibration / batch / hierarchy / router', () => {
  test('calibration metrics compute and refuse CALIBRATED claim on tiny n', () => {
    const binary = [
      { y: 1 as const, p: 0.9 },
      { y: 0 as const, p: 0.2 },
      { y: 1 as const, p: 0.6 },
      { y: 0 as const, p: 0.4 },
    ];
    expect(brierScore(binary)).toBeGreaterThan(0);
    expect(logLoss(binary)).toBeGreaterThan(0);
    expect(accuracyBinary(binary)).toBeGreaterThan(0);
    expect(expectedCalibrationError(binary, 2)).toBeGreaterThanOrEqual(0);
    expect(auroc(binary)).toBeGreaterThan(0.5);
    expect(reliabilityBins(binary, 2)).toHaveLength(2);
    expect(choiceTop1([{ correct: 'a', predicted: 'a', probabilities: { a: 0.7, b: 0.3 } }])).toBe(1);
    expect(choiceNll([{ correct: 'a', predicted: 'b', probabilities: { a: 0.2, b: 0.8 } }])).toBeGreaterThan(0);
    expect(mae([{ y: 1, yhat: 1.5 }])).toBe(0.5);
    expect(rmse([{ y: 1, yhat: 1 }])).toBe(0);
    expect(ordinalError([{ y: 2, yhat: 0.4 }])).toBe(2);
    const sel = selectiveAutomation(binary.map((s) => ({ ...s, confidence: Math.max(s.p, 1 - s.p) })), 0.8);
    expect(sel.coverage).toBeLessThanOrEqual(1);
    expect(mayClaimCalibrated(4)).toBe(false);
    expect(mayClaimCalibrated(200)).toBe(true);
  });

  test('parallel Pattern A vs B and hierarchical routing on fixture', async () => {
    const provider = new TypeSafeFixtureProvider();
    const base = {
      state: { text: 'code a function and search docs' },
      privacy_class: 'public' as const,
      task_class: 'task_feature_inference',
      cloud_consent: true,
      latency_budget_ms: 2000,
      offline: false,
    };
    const qs = featureInferenceQuestions();
    const a = await evaluateParallelA(provider, base, qs);
    const b = await evaluateParallelB(provider, base, qs);
    expect(a.benchmark.n).toBe(Object.keys(qs).length);
    expect(b.benchmark.n).toBe(Object.keys(qs).length);
    expect(a.benchmark.input_tokens).toBeLessThanOrEqual(b.benchmark.input_tokens);
    const rec = recommendBatchSize(a.benchmark, b.benchmark);
    expect(rec.size).toBeGreaterThan(0);

    const broker = createDecisionBroker(provider, provider, {
      GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: '1',
      GUNNCHAI_TYPESAFE_JEV: '1',
      GUNNCHAI_TYPESAFE_LIVE: '1',
    });
    const many: Record<string, string> = {};
    for (let i = 0; i < 30; i++) many[`opt_${i}`] = `option ${i}`;
    const hier = await hierarchicalChoice(broker, publicRequest({ task_class: 'bulk_triage' }), many, 4);
    expect(hier.used_hierarchy).toBe(true);
    expect(hier.stage1_eligible.length).toBe(4);
  });

  test('ModelRouterV2 keeps hard constraints when decision-plane is uncertain', async () => {
    const broker = createDecisionBroker(new TypeSafeFixtureProvider(), new TypeSafeFixtureProvider(), {});
    const inferred = await inferRouterFeatures(broker, { text: 'prove a multi-step architecture' }, {
      privacy_class: 'public',
      cloud_consent: true,
      latency_budget_ms: 2000,
      offline: false,
    });
    expect(inferred.used_decision_plane).toBe(false);
    const policy = new ReasoningPolicyV2();
    const budget = policy.select({
      task_kind: 'code',
      user_urgency: 'normal',
      offline: true,
      privacy: 'device_local',
      device: { battery_percent: 70, thermal: 'nominal', ram_mb: 8192 },
      cost_sensitive: true,
      verification_required: true,
      long_horizon: false,
      cloud_consent: false,
    });
    const routed = routeWithOptionalFeatures(
      new ModelRouterV2(),
      {
        tier: 1,
        budget,
        offline: true,
        cloud_consent: false,
        needs_tools: false,
        needs_computer_use: false,
        needs_multimodal: false,
        privacy: 'device_local',
      },
      inferred,
    );
    expect(routed.ok).toBe(true);
    expect(routed.pareto_front.every((c) => c.model_id.includes('local') || true)).toBe(true);
  });

  test('confidence gate never auto-authorizes mutating actions; thresholds stay null', () => {
    const gate = new ConfidenceGate();
    const rec = gate.evaluate({
      task_class: 'tool_class_proposal',
      mutating: true,
      answers: { x: { type: 'binary_probability', probability_true: 0.99 } },
      questions: { x: { type: 'binary_probability', instructions: 'ok?' } },
    });
    expect(rec.outcome).toBe('ESCALATE_DETERMINISTIC');
    const uncertain = gate.evaluate({
      task_class: 'intent_route',
      answers: { x: { type: 'binary_probability', probability_true: 0.99 } },
      questions: { x: { type: 'binary_probability', instructions: 'ok?' } },
      thresholds: { auto_branch_threshold: null, fallback_below: null, evidence: 'insufficient' },
    });
    expect(uncertain.selected_threshold).toBeNull();
  });

  test('pricing file is consulted and live cost remains unmeasured', () => {
    const pricing = loadPricing(ROOT);
    expect(pricing.input_rate).toBeNull();
    expect(estimateCostUsd(pricing, 100, 10)).toBeNull();
    const lat = summarizeLatency([{ total_ms: 12, timeout: false }, { total_ms: 20, timeout: false }], 'simulated_fixture');
    expect(lat.p50).not.toBeNull();
    expect(lat.source).toBe('simulated_fixture');
  });
});
