/**
 * Continuance V — callable product service contracts for gunnchOS integration.
 */

import type { ProcessingMode } from '../../local-runtime/types';
import type { DeviceProfileId, SystemCapability } from '../model_registry';

export const PRODUCT_SERVICE_NAME = 'gunnchAI3k-product-service';
export const PRODUCT_SERVICE_VERSION = '0.5.0-continuation-v';
export const PRODUCT_SERVICE_TOKEN = 'GUNNCHAI_PRODUCT_SERVICE_LOCAL_PASS';

/** Product routes beyond the 11 eval capabilities. */
export type ProductRoute =
  | SystemCapability
  | 'continuity'
  | 'content_adaptation'
  | 'connection_path';

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
  | 'monitor:read';

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
}
