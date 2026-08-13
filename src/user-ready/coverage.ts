/**
 * Derived coverage counts. Never hand-edit a PASS into the matrix JSON.
 */

import type { MarketTaskMatrix } from './matrix';

export interface TaskPassLike {
  task_id: string;
  passed: boolean;
}

export interface CoverageCounts {
  required: number;
  implemented: number;
  runtime: number;
  offline: number;
  cloud_only: number;
  cloud_consent: number;
  open: number;
  gap: number;
  implemented_ids: string[];
  runtime_ids: string[];
  offline_ids: string[];
  cloud_consent_ids: string[];
  open_ids: string[];
}

export function coverageFrom(
  matrix: MarketTaskMatrix,
  results: TaskPassLike[],
): CoverageCounts {
  const required = matrix.tasks.length;
  const implementedTasks = matrix.tasks.filter((t) => t.implemented);
  const implemented = implementedTasks.length;
  const runtimeResults = results.filter((r) => r.passed);
  const runtime = runtimeResults.length;
  const offlineTasks = matrix.tasks.filter((t) => t.local_required && t.implemented);
  const offline = offlineTasks.length;
  const cloudOnlyOpen = matrix.tasks.filter(
    (t) => !t.local_required && t.cloud_optional && !t.implemented,
  );
  const cloudConsentTasks = matrix.tasks.filter(
    (t) => t.implemented && t.cloud_optional,
  );
  const openTasks = matrix.tasks.filter((t) => !t.implemented);
  return {
    required,
    implemented,
    runtime,
    offline,
    cloud_only: cloudOnlyOpen.length,
    cloud_consent: cloudConsentTasks.length,
    open: openTasks.length,
    gap: openTasks.length,
    implemented_ids: implementedTasks.map((t) => t.task_id),
    runtime_ids: runtimeResults.map((r) => r.task_id),
    offline_ids: offlineTasks.map((t) => t.task_id),
    cloud_consent_ids: cloudConsentTasks.map((t) => t.task_id),
    open_ids: openTasks.map((t) => t.task_id),
  };
}
