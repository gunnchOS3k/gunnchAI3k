/**
 * Derived coverage truth. Never hand-edit a PASS into the matrix JSON.
 * COMPLETE / PARTIAL / OPEN are authoritative; implemented=true only for COMPLETE.
 */

import type { CoverageStatus, MarketTaskMatrix } from './matrix';

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
  complete: number;
  partial: number;
  implemented_ids: string[];
  runtime_ids: string[];
  offline_ids: string[];
  cloud_consent_ids: string[];
  open_ids: string[];
  complete_ids: string[];
  partial_ids: string[];
}

function statusOf(task: { coverage_status?: CoverageStatus; implemented: boolean }): CoverageStatus {
  if (task.coverage_status) return task.coverage_status;
  return task.implemented ? 'COMPLETE' : 'OPEN';
}

export function coverageTruthFrom(
  matrix: MarketTaskMatrix,
  results: TaskPassLike[],
): CoverageCounts {
  const required = matrix.tasks.length;
  const completeTasks = matrix.tasks.filter((t) => statusOf(t) === 'COMPLETE');
  const partialTasks = matrix.tasks.filter((t) => statusOf(t) === 'PARTIAL');
  const openTasks = matrix.tasks.filter((t) => statusOf(t) === 'OPEN');
  const implementedTasks = completeTasks;
  const implemented = implementedTasks.length;
  const runtimeResults = results.filter((r) => r.passed);
  const runtime = runtimeResults.length;
  const offlineTasks = matrix.tasks.filter((t) => t.local_required && statusOf(t) === 'COMPLETE');
  const offline = offlineTasks.length;
  const cloudOnlyOpen = matrix.tasks.filter(
    (t) => !t.local_required && t.cloud_optional && statusOf(t) === 'OPEN',
  );
  const cloudConsentTasks = matrix.tasks.filter(
    (t) => statusOf(t) !== 'OPEN' && t.cloud_optional,
  );
  return {
    required,
    implemented,
    runtime,
    offline,
    cloud_only: cloudOnlyOpen.length,
    cloud_consent: cloudConsentTasks.length,
    open: openTasks.length,
    gap: openTasks.length + partialTasks.length,
    complete: completeTasks.length,
    partial: partialTasks.length,
    implemented_ids: implementedTasks.map((t) => t.task_id),
    runtime_ids: runtimeResults.map((r) => r.task_id),
    offline_ids: offlineTasks.map((t) => t.task_id),
    cloud_consent_ids: cloudConsentTasks.map((t) => t.task_id),
    open_ids: openTasks.map((t) => t.task_id),
    complete_ids: completeTasks.map((t) => t.task_id),
    partial_ids: partialTasks.map((t) => t.task_id),
  };
}

/** @deprecated Prefer coverageTruthFrom — kept for call-site compatibility. */
export const coverageFrom = coverageTruthFrom;
