import type { TypeSafeModelMetadata } from './typesafe_api_contract';

export interface DiscoveredModels {
  models: TypeSafeModelMetadata[];
  fetched_at: string;
  source: 'live' | 'fixture' | 'none';
}

export function selectCompatibleModel(
  requested: string | undefined,
  discovered: TypeSafeModelMetadata[],
  allowCompatible: boolean,
): { model: string | null; reason: string } {
  if (!discovered.length) return { model: null, reason: 'NO_MODELS_DISCOVERED' };
  if (requested) {
    const exact = discovered.find((m) => m.name === requested);
    if (exact) return { model: exact.name, reason: 'EXACT' };
    if (!allowCompatible) return { model: null, reason: `MODEL_UNAVAILABLE:${requested}` };
  }
  if (!allowCompatible && requested) return { model: null, reason: `MODEL_UNAVAILABLE:${requested}` };
  return { model: discovered[0].name, reason: requested ? 'COMPATIBLE_FALLBACK' : 'FIRST_DISCOVERED' };
}

export function neverFabricateModel(name: string | null): asserts name is string {
  if (!name) throw new Error('MODEL_NOT_FABRICATED');
}
