/** TypeSafe public HTTP contract snapshot. Source: https://api.typesafe.ai/openapi.json */

export const TYPESAFE_BASE_URL = 'https://api.typesafe.ai';
export const TYPESAFE_SYSTEMONE_PATH = '/v1/systemone';
export const TYPESAFE_MODELS_PATH = '/v1/models';
export const TYPESAFE_OPENAPI_URL = 'https://api.typesafe.ai/openapi.json';
export const TYPESAFE_OPENAPI_CAPTURED_AT = '2026-09-23';
export const TYPESAFE_OPENAPI_VERSION = '0.2.0';

export type TypeSafeQuestionType = 'noul' | 'choice' | 'score';

export interface TypeSafeNoulQuestion {
  type: 'noul';
  instructions?: unknown;
  criteria?: { true?: unknown; false?: unknown } | null;
}

export interface TypeSafeChoiceQuestion {
  type: 'choice';
  instructions?: unknown;
  criteria: Record<string, unknown>;
}

export interface TypeSafeScoreQuestion {
  type: 'score';
  instructions?: unknown;
  criteria: unknown[];
}

export type TypeSafeQuestion = TypeSafeNoulQuestion | TypeSafeChoiceQuestion | TypeSafeScoreQuestion;

export interface TypeSafeSystemOneRequest {
  state: unknown;
  model: string;
  questions: Record<string, TypeSafeQuestion>;
}

export interface TypeSafeNoulAnswer {
  type: 'noul';
  noul: number;
}

export interface TypeSafeChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface TypeSafeScoreAnswer {
  type: 'score';
  score: number;
  confidence: number;
  legend: Record<string, unknown>;
  probabilities: Record<string, number>;
}

export type TypeSafeAnswer = TypeSafeNoulAnswer | TypeSafeChoiceAnswer | TypeSafeScoreAnswer;

export interface TypeSafeUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface TypeSafeSystemOneResponse {
  model: string;
  answers: Record<string, TypeSafeAnswer>;
  usage: TypeSafeUsage;
}

export interface TypeSafeModelMetadata {
  name: string;
  description: string;
  release_date: string;
}

export interface TypeSafeModelMetadataList {
  models: TypeSafeModelMetadata[];
}

export interface TypeSafeValidationError {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface TypeSafeHTTPValidationError {
  detail?: TypeSafeValidationError[];
}
