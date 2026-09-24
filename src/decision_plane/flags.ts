export type SystemOneFlagName =
  | 'GUNNCHAI_SYSTEM_ONE_DECISION_PLANE'
  | 'GUNNCHAI_TYPESAFE_JEV'
  | 'GUNNCHAI_TYPESAFE_LIVE'
  | 'GUNNCHAI_JEV_INTENT_ROUTING'
  | 'GUNNCHAI_JEV_RETRIEVAL_RERANK'
  | 'GUNNCHAI_JEV_TOOL_PROPOSAL'
  | 'GUNNCHAI_JEV_AGENT_CONTROLLER'
  | 'GUNNCHAI_JEV_WAIKE_ROUTING';

export const SYSTEM_ONE_FLAG_NAMES: SystemOneFlagName[] = [
  'GUNNCHAI_SYSTEM_ONE_DECISION_PLANE',
  'GUNNCHAI_TYPESAFE_JEV',
  'GUNNCHAI_TYPESAFE_LIVE',
  'GUNNCHAI_JEV_INTENT_ROUTING',
  'GUNNCHAI_JEV_RETRIEVAL_RERANK',
  'GUNNCHAI_JEV_TOOL_PROPOSAL',
  'GUNNCHAI_JEV_AGENT_CONTROLLER',
  'GUNNCHAI_JEV_WAIKE_ROUTING',
];

function parseFlag(raw: string | undefined): boolean {
  if (raw === undefined || raw === '') return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function isSystemOneFlagEnabled(name: SystemOneFlagName, env: NodeJS.ProcessEnv = process.env): boolean {
  return parseFlag(env[name]);
}

export function readSystemOneFlags(env: NodeJS.ProcessEnv = process.env): Record<SystemOneFlagName, boolean> {
  return {
    GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: isSystemOneFlagEnabled('GUNNCHAI_SYSTEM_ONE_DECISION_PLANE', env),
    GUNNCHAI_TYPESAFE_JEV: isSystemOneFlagEnabled('GUNNCHAI_TYPESAFE_JEV', env),
    GUNNCHAI_TYPESAFE_LIVE: isSystemOneFlagEnabled('GUNNCHAI_TYPESAFE_LIVE', env),
    GUNNCHAI_JEV_INTENT_ROUTING: isSystemOneFlagEnabled('GUNNCHAI_JEV_INTENT_ROUTING', env),
    GUNNCHAI_JEV_RETRIEVAL_RERANK: isSystemOneFlagEnabled('GUNNCHAI_JEV_RETRIEVAL_RERANK', env),
    GUNNCHAI_JEV_TOOL_PROPOSAL: isSystemOneFlagEnabled('GUNNCHAI_JEV_TOOL_PROPOSAL', env),
    GUNNCHAI_JEV_AGENT_CONTROLLER: isSystemOneFlagEnabled('GUNNCHAI_JEV_AGENT_CONTROLLER', env),
    GUNNCHAI_JEV_WAIKE_ROUTING: isSystemOneFlagEnabled('GUNNCHAI_JEV_WAIKE_ROUTING', env),
  };
}

export const SYSTEM_ONE_FLAG_DEFAULTS: Record<SystemOneFlagName, boolean> = {
  GUNNCHAI_SYSTEM_ONE_DECISION_PLANE: false,
  GUNNCHAI_TYPESAFE_JEV: false,
  GUNNCHAI_TYPESAFE_LIVE: false,
  GUNNCHAI_JEV_INTENT_ROUTING: false,
  GUNNCHAI_JEV_RETRIEVAL_RERANK: false,
  GUNNCHAI_JEV_TOOL_PROPOSAL: false,
  GUNNCHAI_JEV_AGENT_CONTROLLER: false,
  GUNNCHAI_JEV_WAIKE_ROUTING: false,
};

export function systemOnePlaneEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isSystemOneFlagEnabled('GUNNCHAI_SYSTEM_ONE_DECISION_PLANE', env);
}

export function typesafeJevEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    systemOnePlaneEnabled(env) &&
    isSystemOneFlagEnabled('GUNNCHAI_TYPESAFE_JEV', env)
  );
}

export function typesafeLiveEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return typesafeJevEnabled(env) && isSystemOneFlagEnabled('GUNNCHAI_TYPESAFE_LIVE', env);
}

export function taskFlagEnabled(taskClass: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const map: Record<string, SystemOneFlagName> = {
    intent_route: 'GUNNCHAI_JEV_INTENT_ROUTING',
    retrieval_relevance: 'GUNNCHAI_JEV_RETRIEVAL_RERANK',
    tool_class_proposal: 'GUNNCHAI_JEV_TOOL_PROPOSAL',
    agent_continue_stop: 'GUNNCHAI_JEV_AGENT_CONTROLLER',
    agent_stuck_detection: 'GUNNCHAI_JEV_AGENT_CONTROLLER',
    waike_tutor_mode: 'GUNNCHAI_JEV_WAIKE_ROUTING',
  };
  const flag = map[taskClass];
  if (!flag) return systemOnePlaneEnabled(env);
  return systemOnePlaneEnabled(env) && isSystemOneFlagEnabled(flag, env);
}
