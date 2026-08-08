/**
 * Continuance VI — permission gates for product routes.
 */

import type { PermissionScope, ProductRoute } from './types';

const ROUTE_REQUIRED: Record<ProductRoute, PermissionScope[]> = {
  tutoring: ['assist'],
  code: ['assist'],
  device_help: ['assist'],
  a11y: ['assist'],
  game_coach: ['assist'],
  network: ['assist'],
  rag: ['assist', 'rag:search'],
  scientific: ['assist', 'rag:search'],
  translation: ['assist'],
  workflow: ['assist'],
  security: ['assist'],
  continuity: ['assist', 'continuity:read'],
  content_adaptation: ['assist'],
  connection_path: ['assist'],
  input_interpretation: ['assist'],
  safety_alert: ['assist'],
};

export const DEFAULT_LOCAL_PERMISSIONS: PermissionScope[] = [
  'assist',
  'rag:ingest',
  'rag:search',
  'rag:delete',
  'rag:rebuild',
  'governance:read',
  'governance:consent',
  'governance:override',
  'governance:rollback',
  'continuity:read',
  'continuity:write',
  'monitor:read',
  'audit:read',
  'os:discover',
];

export function requiredScopesForRoute(route: ProductRoute): PermissionScope[] {
  return ROUTE_REQUIRED[route] ?? ['assist'];
}

export function checkPermissions(
  granted: PermissionScope[] | undefined,
  required: PermissionScope[],
): { ok: boolean; missing: PermissionScope[] } {
  const set = new Set(granted?.length ? granted : DEFAULT_LOCAL_PERMISSIONS);
  const missing = required.filter((s) => !set.has(s));
  return { ok: missing.length === 0, missing };
}

export function assertPermission(
  granted: PermissionScope[] | undefined,
  required: PermissionScope | PermissionScope[],
): void {
  const req = Array.isArray(required) ? required : [required];
  const result = checkPermissions(granted, req);
  if (!result.ok) {
    throw new Error(`PERMISSION_DENIED missing=${result.missing.join(',')}`);
  }
}
