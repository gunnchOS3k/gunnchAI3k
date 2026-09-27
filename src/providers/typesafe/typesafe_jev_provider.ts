import type { DecisionRequest, DecisionResponse } from '../../decision_plane/contracts';
import { validateDecisionRequest } from '../../decision_plane/contracts';
import type { DecisionProvider, DecisionProviderHealth } from '../../decision_plane/decision_provider';
import { buildProvenance } from '../../decision_plane/provenance';
import { redactError } from '../../decision_plane/redaction';
import {
  TYPESAFE_BASE_URL,
  TYPESAFE_SYSTEMONE_PATH,
} from './typesafe_api_contract';
import { CircuitBreaker, TypeSafeError, classifyHttpError } from './typesafe_errors';
import { probeTypeSafeModels } from './typesafe_health';
import { mapRequestToTypeSafe, mapResponseFromTypeSafe, validateTypeSafeResponseShape } from './typesafe_mapper';
import { selectCompatibleModel, type DiscoveredModels } from './typesafe_models';

export interface TypeSafeJevProviderOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  defaultTimeoutMs?: number;
}

export class TypeSafeJevProvider implements DecisionProvider {
  readonly provider_id = 'typesafe';
  readonly remote = true;
  readonly offline_capable = false;
  private readonly breaker = new CircuitBreaker();
  private discovery: DiscoveredModels = { models: [], fetched_at: '', source: 'none' };

  constructor(private readonly opts: TypeSafeJevProviderOptions = {}) {}

  async health(signal?: AbortSignal): Promise<DecisionProviderHealth> {
    const health = await probeTypeSafeModels(
      {
        fetchImpl: this.opts.fetchImpl,
        apiKey: this.opts.apiKey ?? process.env.TYPESAFE_API_KEY,
        baseUrl: this.opts.baseUrl,
        breaker: this.breaker,
      },
      signal,
    );
    if (health.ok) {
      this.discovery = { models: health.models, fetched_at: health.fetched_at, source: 'live' };
    }
    return health;
  }

  async evaluate(request: DecisionRequest, signal?: AbortSignal): Promise<DecisionResponse> {
    const started = Date.now();
    const valid = validateDecisionRequest(request);
    if (!valid.ok) throw new TypeSafeError('REQUEST_INVALID', valid.reason);
    if (this.breaker.open) throw new TypeSafeError('CIRCUIT_OPEN', 'circuit open');

    const apiKey = this.opts.apiKey ?? process.env.TYPESAFE_API_KEY ?? '';
    if (!apiKey) throw new TypeSafeError('AUTH_FAILURE', 'LIVE_JEV_ACCESS_REQUIRED');

    if (!this.discovery.models.length) {
      const health = await this.health(signal);
      if (!health.ok) throw new TypeSafeError('MODEL_UNAVAILABLE', health.reason);
    }

    const selected = selectCompatibleModel(
      request.requested_model,
      this.discovery.models,
      request.allow_compatible_model !== false,
    );
    if (!selected.model) throw new TypeSafeError('MODEL_UNAVAILABLE', selected.reason);

    const payload = mapRequestToTypeSafe(request, selected.model);
    const timeoutMs = Math.min(request.latency_budget_ms, this.opts.defaultTimeoutMs ?? request.latency_budget_ms);
    const body = await this.postWithRetry(payload, timeoutMs, signal);
    const remote = validateTypeSafeResponseShape(body);
    const answers = mapResponseFromTypeSafe(remote, request.questions);
    const usage = remote.usage;
    const latency_ms = Date.now() - started;
    return {
      provider_id: this.provider_id,
      model_id: remote.model,
      answers,
      usage,
      latency_ms,
      provenance: buildProvenance({
        provider_id: this.provider_id,
        model_id: remote.model,
        remote: true,
        request,
        usage,
        latency_ms,
      }),
    };
  }

  private async postWithRetry(payload: unknown, timeoutMs: number, outer?: AbortSignal): Promise<unknown> {
    const fetchImpl = this.opts.fetchImpl ?? fetch;
    const maxRetries = this.opts.maxRetries ?? 2;
    let last: TypeSafeError | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (outer?.aborted) throw new TypeSafeError('CANCELLED', 'request cancelled');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const onAbort = () => controller.abort();
      outer?.addEventListener('abort', onAbort);
      try {
        const res = await fetchImpl(`${this.opts.baseUrl ?? TYPESAFE_BASE_URL}${TYPESAFE_SYSTEMONE_PATH}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.opts.apiKey ?? process.env.TYPESAFE_API_KEY ?? ''}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          const err = classifyHttpError(res.status, text);
          last = err;
          if (!err.retryable || attempt === maxRetries) {
            this.breaker.fail();
            throw err;
          }
          await sleep(50 * 2 ** attempt);
          continue;
        }
        this.breaker.succeed();
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new TypeSafeError('UNEXPECTED_RESPONSE', 'non-json body');
        }
      } catch (err) {
        if (err instanceof TypeSafeError) {
          last = err;
          if (!err.retryable || attempt === maxRetries) {
            this.breaker.fail();
            throw err;
          }
        } else if (err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message))) {
          throw new TypeSafeError(outer?.aborted ? 'CANCELLED' : 'TIMEOUT', redactError(err.message));
        } else {
          last = new TypeSafeError('CONNECTION_FAILURE', redactError(err));
          if (attempt === maxRetries) {
            this.breaker.fail();
            throw last;
          }
        }
      } finally {
        clearTimeout(timer);
        outer?.removeEventListener('abort', onAbort);
      }
    }
    this.breaker.fail();
    throw last ?? new TypeSafeError('CONNECTION_FAILURE', 'exhausted retries');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
