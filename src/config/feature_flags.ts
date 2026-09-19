/**
 * Feature flags for KIRBY-4 controlled integration + nearby-edge.
 * Defaults OFF — no behavior change unless explicitly enabled.
 */
export type FeatureFlagName =
  | 'GUNNCHAI_LIVE_PROVIDER_INTEGRATION'
  | 'GUNNCHAI_NEARBY_EDGE';

function parseFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function isFeatureEnabled(name: FeatureFlagName, env: NodeJS.ProcessEnv = process.env): boolean {
  return parseFlag(env[name]);
}

export function readFeatureFlags(env: NodeJS.ProcessEnv = process.env): Record<FeatureFlagName, boolean> {
  return {
    GUNNCHAI_LIVE_PROVIDER_INTEGRATION: isFeatureEnabled('GUNNCHAI_LIVE_PROVIDER_INTEGRATION', env),
    GUNNCHAI_NEARBY_EDGE: isFeatureEnabled('GUNNCHAI_NEARBY_EDGE', env),
  };
}

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagName, boolean> = {
  GUNNCHAI_LIVE_PROVIDER_INTEGRATION: false,
  GUNNCHAI_NEARBY_EDGE: false,
};
