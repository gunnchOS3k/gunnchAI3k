import { createHash } from 'node:crypto';
import type { DecisionRequest, DecisionResponse, PrivacyClass } from './contracts';

export interface CacheKeyParts {
  state_hash: string;
  schema_hash: string;
  provider_model: string;
  policy_version: string;
}

const NEVER_CACHE_PRIVACY: PrivacyClass[] = ['sensitive', 'device_local', 'personal'];

export class DecisionCache {
  private readonly store = new Map<string, { expires: number; value: DecisionResponse }>();

  constructor(
    private readonly maxEntries = 128,
    private readonly ttlMs = 30_000,
  ) {}

  key(request: DecisionRequest, providerModel: string): string {
    const parts = this.parts(request, providerModel);
    return `${parts.provider_model}|${parts.policy_version}|${parts.schema_hash}|${parts.state_hash}`;
  }

  parts(request: DecisionRequest, providerModel: string): CacheKeyParts {
    return {
      state_hash: sha256(stable(request.state)),
      schema_hash: sha256(stable(request.questions)),
      provider_model: providerModel,
      policy_version: request.policy_version ?? 'kirby5.system_one.v1',
    };
  }

  eligible(request: DecisionRequest, mutating = false): boolean {
    if (mutating) return false;
    if (NEVER_CACHE_PRIVACY.includes(request.privacy_class)) return false;
    return request.privacy_class === 'public';
  }

  get(key: string): DecisionResponse | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: DecisionResponse): void {
    if (this.store.size >= this.maxEntries) {
      const first = this.store.keys().next().value;
      if (first) this.store.delete(first);
    }
    this.store.set(key, { expires: Date.now() + this.ttlMs, value });
  }

  invalidate(): void {
    this.store.clear();
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`)
    .join(',')}}`;
}
