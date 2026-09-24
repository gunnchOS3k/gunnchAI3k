/**
 * Feature flags for KIRBY-4 controlled integration + nearby-edge + KIRBY-5 System One.
 * Defaults OFF — no behavior change unless explicitly enabled.
 */
export type FeatureFlagName =
  | 'GUNNCHAI_LIVE_PROVIDER_INTEGRATION'
  | 'GUNNCHAI_NEARBY_EDGE'
  | 'GUNNCHAI_SYSTEM_ONE_DECISION_PLANE'
  | 'GUNNCHAI_TYPESAFE_JEV'
  | 'GUNNCHAI_TYPESAFE_LIVE'
  | 'GUNNCHAI_JEV_INTENT_ROUTING'
  | 'GUNNCHAI_JEV_RETRIEVAL_RERANK'
  | 'GUNNCHAI_JEV_TOOL_PROPOSAL'
  | 'GUNNCHAI_JEV_AGENT_CONTROLLER'
  | 'GUNNCHAI_JEV_WAIKE_ROUTING';

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
    GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: isFeatureEnabled('GUNNCHAI_SYSTEM_ONE_DECISION_PLANE', env),
    GUNNCHAI_TYPESAFE_JEV: isFeatureEnabled('GUNNCHAI_TYPESAFE_JEV', env),
    GUNNCHAI_TYPESAFE_LIVE: isFeatureEnabled('GUNNCHAI_TYPESAFE_LIVE', env),
    GUNNCHAI_JEV_INTENT_ROUTING: isFeatureEnabled('GUNNCHAI_JEV_INTENT_ROUTING', env),
    GUNNCHAI_JEV_RETRIEVAL_RERANK: isFeatureEnabled('GUNNCHAI_JEV_RETRIEVAL_RERANK', env),
    GUNNCHAI_JEV_TOOL_PROPOSAL: isFeatureEnabled('GUNNCHAI_JEV_TOOL_PROPOSAL', env),
    GUNNCHAI_JEV_AGENT_CONTROLLER: isFeatureEnabled('GUNNCHAI_JEV_AGENT_CONTROLLER', env),
    GUNNCHAI_JEV_WAIKE_ROUTING: isFeatureEnabled('GUNNCHAI_JEV_WAIKE_ROUTING', env),
  };
}

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagName, boolean> = {
  GUNNCHAI_LIVE_PROVIDER_INTEGRATION: false,
  GUNNCHAI_NEARBY_EDGE: false,
  GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: false,
  GUNNCHAI_TYPESAFE_JEV: false,
  GUNNCHAI_TYPESAFE_LIVE: false,
  GUNNCHAI_JEV_INTENT_ROUTING: false,
  GUNNCHAI_JEV_RETRIEVAL_RERANK: false,
  GUNNCHAI_JEV_TOOL_PROPOSAL: false,
  GUNNCHAI_JEV_AGENT_CONTROLLER: false,
  GUNNCHAI_JEV_WAIKE_ROUTING: false,
};
