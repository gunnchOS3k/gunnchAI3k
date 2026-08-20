export type ValidationState =
  | 'VALIDATED'
  | 'IMPLEMENTED_VALIDATION_OPEN'
  | 'RECLASSIFY_TO_DIGITAL_IMPLEMENTATION_OPEN'
  | 'BLOCKED_ENVIRONMENT'
  | 'BLOCKED_EXTERNAL';

export type RuntimeKind =
  | 'LOCAL_TEMPLATE_ENGINE'
  | 'LOCAL_NEURAL_MODEL'
  | 'LOCAL_RAG_INDEX'
  | 'LOCAL_GOVERNANCE_RUNTIME'
  | 'LOCAL_NETWORK_GUARD'
  | 'LOCAL_ROUTER'
  | 'LOCAL_PRODUCT_SERVICE';

export interface NegativeCase {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
}

export interface RequirementEvalResult {
  requirementId: string;
  title: string;
  validationState: ValidationState;
  runtimeKind: RuntimeKind;
  metrics: Record<string, number | boolean | string>;
  negativeCases: NegativeCase[];
  evidencePaths: string[];
  notes: string;
  crossCheckRequirementProof?: {
    runtimeProven: boolean;
    note: string;
  };
}

export interface Wave003Report {
  schema: 'gunnchai.engineering_wave003.v1';
  wave: '003';
  generatedAt: string;
  branch: string;
  acceptedMainSha: string;
  doctrine: {
    independentEvaluator: true;
    validationImportsRequirementProof: false;
    requirementProofRole: 'cross-check-only';
  };
  targetRequirements: string[];
  results: RequirementEvalResult[];
  summary: {
    validated: number;
    implementedValidationOpen: number;
    reclassify: number;
    blockedEnvironment: number;
    blockedExternal: number;
    total: number;
  };
  claimBoundaries: Record<string, boolean>;
  independentDigitalReproduction: 'PASS' | 'PARTIAL' | 'FAIL';
  allTargetEvaluated: boolean;
  releaseComplete: boolean;
  independentReproduction?: IndependentReproductionRecord;
}

export interface CanonicalRequirementRow {
  requirementId: string;
  validationState: ValidationState;
  negativeCasePass: Record<string, boolean>;
  metrics: Record<string, number | boolean | string>;
}

export interface IndependentReproductionRecord {
  schema: 'gunnchai.engineering_wave003.independent_reproduction.v1';
  primaryRunId: string;
  freshRunId: string;
  primaryCommit: string;
  freshCommit: string;
  evaluatorHash: string;
  fixtureHashes: Record<string, string>;
  seed: string;
  perRequirementStateMatch: boolean;
  metricComparison: Array<{
    requirementId: string;
    metric: string;
    primary: number | boolean | string | undefined;
    fresh: number | boolean | string | undefined;
    withinTolerance: boolean;
  }>;
  tolerances: { latencyMsAbs: number; ignoreMetricKeys: string[] };
  unexpected_differences: string[];
  result: 'PASS' | 'PARTIAL' | 'FAIL';
  childExitCode: number | null;
  method: string;
}
