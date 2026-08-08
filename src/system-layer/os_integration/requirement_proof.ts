/**
 * Continuance VI — re-prove normative AI requirement nodes against live routes.
 */

import type { GunnchAIProductService } from '../product_service/service';
import type { RequirementNodeStatus } from '../product_service/types';

const NORMATIVE_IDS = [
  'AI-CORE-001',
  'AI-CORE-002',
  'AI-CORE-003',
  'AI-CORE-004',
  'AI-CORE-005',
  'AI-CORE-006',
  'AI-CORE-007',
  'AI-CORE-008',
  'AI-CORE-009',
  'AI-CORE-010',
  'AI-CORE-011',
  'AI-CORE-012',
  'AI-CORE-013',
  'AI-CORE-014',
  'AI-CORE-015',
  'AI-GOV-001',
  'AI-GOV-002',
  'AI-GOV-003',
  'AI-GOV-004',
  'AI-GOV-005',
  'AI-GOV-006',
  'AI-GOV-007',
  'AI-GOV-008',
  'AI-GOV-009',
  'AI-GOV-010',
  'AI-GOV-011',
  'AI-GOV-012',
  'AI-LOCAL-001',
  'AI-LOCAL-002',
  'AI-LOCAL-003',
  'AI-LOCAL-004',
  'AI-LOCAL-005',
  'AI-LOCAL-006',
  'AI-LOCAL-007',
  'AI-LOCAL-008',
  'AI-LOCAL-009',
  'AI-LOCAL-010',
  'AI-LOCAL-011',
] as const;

export interface RequirementProofReport {
  continuation: 'VI';
  generatedAt: string;
  normativeTotal: number;
  runtimeProven: number;
  allNormativeRuntime: boolean;
  nodes: RequirementNodeStatus[];
  missingRuntime: string[];
  routeCoverage: Array<{ id: string; route?: string; hasMatchingRoute: boolean }>;
  fullPlatformTokenEarned: false;
  digitallyValidatedEarned: false;
}

export function proveRequirements(service: GunnchAIProductService): RequirementProofReport {
  const nodes = service.requirementStatus();
  const routes = service.listRoutes();
  const routePaths = new Set(routes.map((r) => r.path));

  const missingRuntime: string[] = [];
  const routeCoverage = NORMATIVE_IDS.map((id) => {
    const node = nodes.find((n) => n.id === id);
    if (!node || node.status !== 'RUNTIME') missingRuntime.push(id);
    const route = node?.route;
    const hasMatchingRoute =
      !route ||
      route === 'system-layer:eval' ||
      route === '/health' ||
      routePaths.has(route) ||
      [...routePaths].some((p) => {
        if (route.endsWith('/*')) {
          const prefix = route.replace(/\/\*$/, '/');
          return p.startsWith(prefix) || p === route.replace(/\/\*$/, '');
        }
        if (route.includes('|')) {
          return route.split('|').some((part) => routePaths.has(part.trim()) || p === part.trim());
        }
        if (route.startsWith('/v1/assist') && p.startsWith('/v1/assist')) return true;
        if (route.startsWith('/v1/governance') && p.startsWith('/v1/governance')) return true;
        if (route.startsWith('/v1/rag') && p.startsWith('/v1/rag')) return true;
        if (route.startsWith('/v1/continuity') && p.startsWith('/v1/continuity')) return true;
        return p === route;
      });
    return { id, route, hasMatchingRoute };
  });

  const runtimeProven = NORMATIVE_IDS.length - missingRuntime.length;

  return {
    continuation: 'VI',
    generatedAt: new Date().toISOString(),
    normativeTotal: NORMATIVE_IDS.length,
    runtimeProven,
    allNormativeRuntime: missingRuntime.length === 0,
    nodes,
    missingRuntime,
    routeCoverage,
    fullPlatformTokenEarned: false,
    digitallyValidatedEarned: false,
  };
}

export { NORMATIVE_IDS };
