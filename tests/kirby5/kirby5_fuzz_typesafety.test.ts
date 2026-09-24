import { validateDecisionRequest } from '../../src/decision_plane/contracts';
import { mapResponseFromTypeSafe, validateTypeSafeResponseShape } from '../../src/providers/typesafe/typesafe_mapper';
import { TypeSafeError } from '../../src/providers/typesafe/typesafe_errors';
import { TypeSafeJevProvider } from '../../src/providers/typesafe/typesafe_jev_provider';
import { TypeSafeFixtureProvider } from '../../src/providers/typesafe/typesafe_fixture';
import { intentQuestions } from '../../src/decision_plane/tasks/schemas';

describe('KIRBY-5 type-safety fuzz — adapter fails closed', () => {
  test('malformed question names and empty criteria fail validation', () => {
    expect(validateDecisionRequest({
      state: {},
      questions: { '': { type: 'binary_probability', instructions: 'x' } },
      privacy_class: 'public',
      task_class: 'intent_route',
      cloud_consent: true,
      latency_budget_ms: 100,
    }).ok).toBe(false);
    expect(validateDecisionRequest({
      state: {},
      questions: { pick: { type: 'categorical_choice', choices: {} } },
      privacy_class: 'public',
      task_class: 'intent_route',
      cloud_consent: true,
      latency_budget_ms: 100,
    }).reason).toContain('CHOICES_EMPTY');
  });

  test('high-cardinality, unicode, and large state still fail closed on bad responses', () => {
    const choices: Record<string, string> = {};
    for (let i = 0; i < 80; i++) choices[`c_${i}`] = `choice ${i} \u2603`;
    const ok = validateDecisionRequest({
      state: { blob: 'x'.repeat(20_000), unicode: '日本語🔥' },
      questions: { pick: { type: 'categorical_choice', choices } },
      privacy_class: 'public',
      task_class: 'bulk_triage',
      cloud_consent: true,
      latency_budget_ms: 1000,
    });
    expect(ok.ok).toBe(true);
    expect(() => validateTypeSafeResponseShape({ answers: {} })).toThrow(TypeSafeError);
    expect(() =>
      mapResponseFromTypeSafe(
        { model: 'unknown-alias', answers: {}, usage: { input_tokens: 1, output_tokens: 1 } },
        { pick: { type: 'categorical_choice', choices } },
      ),
    ).toThrow(/missing answer/);
  });

  test('unexpected model alias, server error, and timeout payloads fail closed', async () => {
    const fixture = new TypeSafeFixtureProvider({ fail: 'unexpected' });
    await expect(
      fixture.evaluate({
        state: 'ok',
        questions: intentQuestions(),
        privacy_class: 'public',
        task_class: 'intent_route',
        cloud_consent: true,
        latency_budget_ms: 50,
      }),
    ).rejects.toMatchObject({ code: 'UNEXPECTED_RESPONSE' });

    const live = new TypeSafeJevProvider({
      apiKey: 'not-a-real-key',
      fetchImpl: (async () =>
        ({
          ok: false,
          status: 500,
          text: async () => '{"error":"boom","Authorization":"Bearer leaked-key-should-not-surface"}',
        }) as Response) as typeof fetch,
    });
    (live as unknown as { discovery: { models: Array<{ name: string; description: string; release_date: string }>; fetched_at: string; source: string } }).discovery = {
      models: [{ name: 'jev-fixture', description: 'x', release_date: '2026-09-15' }],
      fetched_at: new Date().toISOString(),
      source: 'fixture',
    };
    await expect(
      live.evaluate({
        state: 'ok',
        questions: intentQuestions(),
        privacy_class: 'public',
        task_class: 'intent_route',
        cloud_consent: true,
        latency_budget_ms: 200,
      }),
    ).rejects.toBeInstanceOf(TypeSafeError);
  });
});
