/**
 * Continuance VI — callable product service contracts for gunnchOS integration.
 */

import type { ProcessingMode } from '../../local-runtime/types';
import type { DeviceProfileId, SystemCapability } from '../model_registry';

export const PRODUCT_SERVICE_NAME = 'gunnchAI3k-product-service';
export const PRODUCT_SERVICE_VERSION = '0.7.0-continuation-vii';
export const PRODUCT_SERVICE_TOKEN = 'GUNNCHAI_PRODUCT_SERVICE_LOCAL_PASS';
export const OS_INTEGRATION_TOKEN = 'GUNNCHAI_OS_INTEGRATION_LOCAL_PASS';

/** Product routes beyond the 11 eval capabilities. */
export type ProductRoute =
  | SystemCapability
  | 'continuity'
  | 'content_adaptation'
  | 'connection_path'
  | 'input_interpretation'
  | 'safety_alert';

export type PermissionScope =
  | 'assist'
  | 'rag:ingest'
  | 'rag:search'
  | 'rag:delete'
  | 'rag:rebuild'
  | 'governance:read'
  | 'governance:consent'
  | 'governance:override'
  | 'governance:rollback'
  | 'continuity:read'
  | 'continuity:write'
  | 'monitor:read'
  | 'audit:read'
  | 'os:discover';

export interface ProvenanceRecord {
  requestId: string;
  capability: ProductRoute;
  modelId: string | null;
  modelVersion: string | null;
  backend: string;
  mechanism: string;
  sources: Array<{ id: string; path?: string; score?: number; excerpt?: string }>;
  grounded: boolean;
  realInference: boolean;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  processingMode: ProcessingMode;
  offline: boolean;
  generatedAt: string;
  integrityNote: string;
}

export interface StructuredAssistPayload {
  kind: ProductRoute;
  summary: string;
  steps?: string[];
  checkQuestion?: string;
  code?: string;
  language?: string;
  rankedSources?: Array<{ id: string; score: number; attribution: string }>;
  claims?: Array<{ claim: string; sourceId: string; caveat: string }>;
  translatedText?: string;
  targetLanguage?: string;
  adaptedText?: string;
  workflowSteps?: string[];
  securityAdvice?: string[];
  continuity?: {
    sessionId: string;
    deviceProfileId: DeviceProfileId;
    lastCapability: ProductRoute;
    snapshotKeys: string[];
  };
  connectionPath?: {
    recommendedBearer: string;
    alternatives: string[];
    rationale: string[];
  };
  inputInterpretation?: {
    modality: string;
    normalizedText: string;
    confidence: number;
    alternatives: string[];
  };
  safetyAlert?: {
    severity: 'info' | 'warning' | 'critical';
    explanation: string;
    recommendedActions: string[];
    defensiveOnly: true;
  };
  [key: string]: unknown;
}

export interface AssistRequest {
  id?: string;
  capability: ProductRoute;
  query: string;
  deviceProfileId?: DeviceProfileId;
  processingMode?: ProcessingMode;
  userCloudConsent?: boolean;
  containsSensitiveLocalData?: boolean;
  permissions?: PermissionScope[];
  purpose?: string;
  continuitySessionId?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface AssistResponse {
  ok: boolean;
  requestId: string;
  capability: ProductRoute;
  text: string;
  structured: StructuredAssistPayload;
  provenance: ProvenanceRecord;
  governance: {
    purposeDeclared: boolean;
    purpose: string;
    consentGranted: boolean;
    minimizationApplied: boolean;
    disclosure: string;
    modelVersion: string;
    humanOverrideActive: boolean;
    fallbackSafe: boolean;
    evalBaselineRef: string;
  };
  errorCode?: string;
  errorMessage?: string;
}

export interface RequirementNodeStatus {
  id: string;
  title: string;
  status: 'RUNTIME' | 'SCHEMA_ONLY' | 'EXTERNAL_REQUIRED' | 'PARTIAL';
  route?: string;
  notes: string;
  proof?: {
    api: string;
    testHint: string;
    evaluated: boolean;
  };
}

export interface OsDiscoveryPayload {
  service: string;
  version: string;
  token: string;
  osIntegrationToken: string;
  bindHint: string;
  topology: string;
  capabilities: Array<{ route: ProductRoute; method: string; path: string }>;
  requirements: RequirementNodeStatus[];
  modelStatus: LocalModelStatus;
  ragStatus: RagSourceStatus;
  permissions: PermissionScope[];
  cancellationSupported: boolean;
  timeoutSupported: boolean;
  unavailableFallback: string;
  fullPlatformDigitalComplete: boolean;
  discordNormative?: false;
}

export interface LocalModelStatus {
  backend: string;
  selectedArchitecture: 'llama.cpp';
  realLocalInference: boolean;
  metricsMode: string;
  activeModelVersion: string;
  modelVersionHistory: string[];
  unavailableFallback: 'deterministic-baseline';
  hostForwardPossible: boolean;
  /** Present llama.cpp GGUF is Nano fallback only (135M / 512-ctx). */
  nanoFallbackOnly: true;
  nanoLabel: string;
}

export interface RagSourceStatus {
  documents: number;
  chunks: number;
  corpora: Record<string, number>;
  rebuiltAt: string | null;
  attributionEnabled: true;
  sources: Array<{ docId: string; corpus: string; title?: string; path: string }>;
}
