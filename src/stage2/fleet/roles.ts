/**
 * Phase XIII Stage 2 — multi-model fleet roles.
 * 135M-class models are Nano/fallback only.
 */

export type ModelRole =
  | 'NANO_LOCAL'
  | 'LOCAL_FAST'
  | 'LOCAL_PRO'
  | 'EMBEDDING'
  | 'RERANKER'
  | 'VISION'
  | 'SPEECH'
  | 'OPTIONAL_FRONTIER_CLOUD';

export const ALL_MODEL_ROLES: ModelRole[] = [
  'NANO_LOCAL',
  'LOCAL_FAST',
  'LOCAL_PRO',
  'EMBEDDING',
  'RERANKER',
  'VISION',
  'SPEECH',
  'OPTIONAL_FRONTIER_CLOUD',
];

export type ModelLocation = 'local' | 'cloud' | 'unavailable';

export type TaskKind =
  | 'tutoring'
  | 'code'
  | 'device'
  | 'research'
  | 'network'
  | 'archive'
  | 'summarize'
  | 'translate'
  | 'classify'
  | 'diagnose'
  | 'reason'
  | 'search'
  | 'embed'
  | 'rerank'
  | 'vision'
  | 'speech';

export interface ModelCandidate {
  id: string;
  role: ModelRole;
  displayName: string;
  family: string;
  parameters: string;
  license: string;
  contextTokens: number;
  approxRamMb: number;
  runtime: string;
  location: ModelLocation;
  optional: boolean;
  notes: string;
  /** Registry integrity — weights are never committed. */
  artifactRef: string;
  sha256: string;
  isNanoFallbackOnly: boolean;
}
