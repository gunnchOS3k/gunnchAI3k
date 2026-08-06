/**
 * Gate 1 local-first runtime contracts and shared types.
 * Explicit: fixture-backed providers are NEVER trained LLMs.
 */

export const RUNTIME_NAME = 'gunnchAI3k-local-runtime';
export const RUNTIME_VERSION = '0.1.0-gate1';
export const STATUS_TOKEN_PASS = 'GUNNCHAI3K_LOCAL_RUNTIME_PASS';

export type ProcessingMode = 'local-only' | 'cloud-allowed';

export type CapabilityKind =
  | 'tutoring'
  | 'code_assistance'
  | 'device_help'
  | 'accessibility'
  | 'connectivity_diagnosis'
  | 'document_retrieval'
  | 'health'
  | 'unsupported';

export type ProviderKind =
  | 'fixture-backed-deterministic'
  | 'optional-local-model'
  | 'cloud';

export interface ProviderIdentity {
  id: string;
  kind: ProviderKind;
  /** Human-readable label; fixture providers must not claim trained-LLM status. */
  label: string;
  isTrainedLlm: boolean;
  modelId: string | null;
  available: boolean;
  discoveryNotes: string[];
}

export interface ResourceMetrics {
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
  uptimeSeconds: number;
  capturedAt: string;
}

export interface Disclosure {
  processingMode: ProcessingMode;
  localCloudDisclosure: string;
  providerKind: ProviderKind;
  isTrainedLlm: boolean;
  networkAllowed: boolean;
}

export interface RetrievedDocument {
  sourceId: string;
  path: string;
  title: string;
  excerpt: string;
  score: number;
}

export interface RuntimeRequest {
  id: string;
  capability: CapabilityKind;
  query: string;
  timeoutMs?: number;
  /** When true, attempt a cloud call (must be rejected in local-only). */
  attemptCloud?: boolean;
  signal?: AbortSignal;
}

export interface RuntimeResponse {
  ok: boolean;
  requestId: string;
  capability: CapabilityKind;
  text: string;
  grounded: boolean;
  sources: string[];
  disclosure: Disclosure;
  provider: ProviderIdentity;
  metrics: ResourceMetrics;
  auditId: string;
  errorCode?: string;
  cancelled?: boolean;
  timedOut?: boolean;
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'stopped';
  runtimeName: string;
  runtimeVersion: string;
  packageVersion: string;
  processingMode: ProcessingMode;
  providers: ProviderIdentity[];
  activeProviderId: string;
  networkAllowed: boolean;
  networkVerification: NetworkVerification;
  metrics: ResourceMetrics;
  restartCount: number;
  startedAt: string;
  disclosure: string;
  statusToken: string | null;
}

export interface NetworkVerification {
  verifiedAt: string;
  mode: ProcessingMode;
  outboundAllowed: boolean;
  probesAttempted: string[];
  probesBlocked: string[];
  result: 'local-only-enforced' | 'cloud-allowed';
}

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  requestId: string;
  capability: CapabilityKind;
  processingMode: ProcessingMode;
  providerId: string;
  providerKind: ProviderKind;
  isTrainedLlm: boolean;
  grounded: boolean;
  sources: string[];
  ok: boolean;
  errorCode?: string;
  metrics: ResourceMetrics;
}

export interface RuntimeAdapter {
  readonly identity: ProviderIdentity;
  generate(input: {
    capability: CapabilityKind;
    query: string;
    documents: RetrievedDocument[];
    signal?: AbortSignal;
  }): Promise<{ text: string; grounded: boolean; sources: string[] }>;
}
