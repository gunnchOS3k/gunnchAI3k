import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ProviderPricing {
  captured_at: string;
  source: string;
  input_rate: number | null;
  output_rate: number | null;
  notes: string;
}

export function loadPricing(repoRoot: string, provider = 'typesafe'): ProviderPricing {
  const p = path.join(repoRoot, 'config', 'provider_pricing', `${provider}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8')) as ProviderPricing;
}

export function estimateCostUsd(pricing: ProviderPricing, inputTokens: number, outputTokens: number): number | null {
  if (pricing.input_rate === null || pricing.output_rate === null) return null;
  return (inputTokens / 1000) * pricing.input_rate + (outputTokens / 1000) * pricing.output_rate;
}
