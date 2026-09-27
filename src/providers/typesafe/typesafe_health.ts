import type { DecisionProviderHealth } from '../../decision_plane/decision_provider';
import {
  TYPESAFE_BASE_URL,
  TYPESAFE_MODELS_PATH,
  type TypeSafeModelMetadataList,
} from './typesafe_api_contract';
import { CircuitBreaker, TypeSafeError, classifyHttpError } from './typesafe_errors';
import { redactError } from '../../decision_plane/redaction';

export interface TypeSafeHealthDeps {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  baseUrl?: string;
  breaker?: CircuitBreaker;
}

function headerBag(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out = { ...headers };
  if (out.Authorization) out.Authorization = 'Bearer [REDACTED]';
  return out;
}

export async function probeTypeSafeModels(deps: TypeSafeHealthDeps = {}, signal?: AbortSignal): Promise<DecisionProviderHealth> {
  const apiKey = deps.apiKey ?? process.env.TYPESAFE_API_KEY ?? '';
  if (!apiKey) {
    return {
      ok: false,
      provider_id: 'typesafe',
      models: [],
      fetched_at: new Date().toISOString(),
      reason: 'LIVE_JEV_ACCESS_REQUIRED',
      live: false,
    };
  }
  const breaker = deps.breaker;
  if (breaker?.open) {
    return {
      ok: false,
      provider_id: 'typesafe',
      models: [],
      fetched_at: new Date().toISOString(),
      reason: 'CIRCUIT_OPEN',
      live: false,
    };
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = deps.baseUrl ?? TYPESAFE_BASE_URL;
  try {
    const res = await fetchImpl(`${base}${TYPESAFE_MODELS_PATH}`, {
      method: 'GET',
      headers: headerBag(apiKey),
      signal,
    });
    if (!res.ok) {
      breaker?.fail();
      const err = classifyHttpError(res.status, await res.text());
      return {
        ok: false,
        provider_id: 'typesafe',
        models: [],
        fetched_at: new Date().toISOString(),
        reason: err.code,
        live: false,
      };
    }
    const body = (await res.json()) as TypeSafeModelMetadataList;
    if (!body?.models || !Array.isArray(body.models)) {
      breaker?.fail();
      throw new TypeSafeError('UNEXPECTED_RESPONSE', 'models payload malformed');
    }
    breaker?.succeed();
    return {
      ok: true,
      provider_id: 'typesafe',
      models: body.models.map((m) => ({
        name: m.name,
        description: m.description,
        release_date: m.release_date,
      })),
      fetched_at: new Date().toISOString(),
      reason: 'OK',
      live: true,
    };
  } catch (err) {
    breaker?.fail();
    const code = err instanceof TypeSafeError ? err.code : err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'CONNECTION_FAILURE';
    return {
      ok: false,
      provider_id: 'typesafe',
      models: [],
      fetched_at: new Date().toISOString(),
      reason: code,
      live: false,
    };
  }
}

export function safeHealthLog(health: DecisionProviderHealth): Record<string, unknown> {
  return {
    ok: health.ok,
    provider_id: health.provider_id,
    model_count: health.models.length,
    fetched_at: health.fetched_at,
    reason: redactError(health.reason),
    live: health.live,
  };
}
