/**
 * Local inference backend interface.
 * Optional llama.cpp / onnxruntime adapters discover install state only —
 * they never download weights and never require admin install.
 */

export type BackendId = 'deterministic' | 'llama.cpp' | 'onnxruntime';

export interface BackendAvailability {
  id: BackendId;
  available: boolean;
  installableWithoutAdmin: boolean;
  notes: string[];
  binaryOrModule: string | null;
}

export interface InferenceRequest {
  capability: string;
  query: string;
  contextDocs?: Array<{ id: string; text: string }>;
  deviceProfileId?: string;
  deviceState?: {
    batteryPct?: number;
    storageHealth?: string;
    network?: string;
  };
  a11yMode?: string;
  readingLevel?: string;
}

export interface InferenceResult {
  backend: BackendId;
  text: string;
  structured: Record<string, unknown>;
  grounded: boolean;
  sources: string[];
  latencyMs: number;
  memoryStubBytes: number;
  isTrainedLlm: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export interface LocalInferenceBackend {
  readonly id: BackendId;
  probe(): BackendAvailability;
  infer(request: InferenceRequest): Promise<InferenceResult>;
}
