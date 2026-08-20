/** Core wave003 scorer MUST NOT import requirement_proof.ts (cross-check lives elsewhere). */
export const VALIDATION_IMPORTS_REQUIREMENT_PROOF = false;

export const WAVE003_BRANCH = 'eng/wave003-validation';
export const ACCEPTED_MAIN_SHA = 'd357846810b952ed49a2c168c05720143b32796b';

export const TARGET_REQUIREMENTS = [
  'AI-LOCAL-001',
  'AI-LOCAL-002',
  'AI-LOCAL-003',
  'AI-LOCAL-005',
  'AI-LOCAL-006',
  'AI-LOCAL-007',
  'AI-LOCAL-008',
  'AI-LOCAL-009',
  'AI-LOCAL-011',
  'AI-GOV-001',
  'AI-GOV-003',
  'AI-GOV-004',
  'AI-GOV-005',
  'AI-GOV-006',
  'AI-GOV-007',
  'AI-GOV-008',
  'AI-GOV-010',
  'AI-GOV-011',
  'AI-GOV-012',
] as const;

export const CLAIM_BOUNDARIES: Record<string, boolean> = {
  HUMAN_E6: false,
  GENERAL_ASR: false,
  GENERAL_VLM: false,
  GENERAL_MT: false,
  LOCAL_PRO_PRIMARY: false,
  CLOUD_SOLE_PATH: false,
};
