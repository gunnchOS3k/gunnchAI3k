import type { DecisionRequest, DecisionResponse } from './contracts';

export interface DecisionProviderHealth {
  ok: boolean;
  provider_id: string;
  models: Array<{ name: string; description: string; release_date: string }>;
  fetched_at: string;
  reason: string;
  live: boolean;
}

export interface DecisionProvider {
  readonly provider_id: string;
  readonly remote: boolean;
  readonly offline_capable: boolean;
  health(signal?: AbortSignal): Promise<DecisionProviderHealth>;
  evaluate(request: DecisionRequest, signal?: AbortSignal): Promise<DecisionResponse>;
}
