/** WAIKE ↔ Nearby-Edge contract v1 — Pixel/WAIKE consume Mac edge; never claim on-device. */
export interface WaikeNearbyEdgeContractV1 {
  schema: 'gunnchai.waike.nearby_edge_contract.v1';
  preferred_transport: 'ADB_REVERSE';
  compute_host: 'mac_nearby_edge';
  device_role: 'pixel_client';
  on_device_local: false;
  endpoints: Array<'/v1/healthz' | '/v1/capabilities' | '/v1/execute' | '/v1/cancel' | '/v1/session'>;
  requires_session: true;
  production_client: false;
  rules: {
    academic_integrity: true;
    no_exam_answer_dump: true;
    model_owned_shell_authority: false;
    adb_reverse_is_not_on_device: true;
  };
}

export const WAIKE_NEARBY_EDGE_CONTRACT_V1: WaikeNearbyEdgeContractV1 = {
  schema: 'gunnchai.waike.nearby_edge_contract.v1',
  preferred_transport: 'ADB_REVERSE',
  compute_host: 'mac_nearby_edge',
  device_role: 'pixel_client',
  on_device_local: false,
  endpoints: ['/v1/healthz', '/v1/capabilities', '/v1/execute', '/v1/cancel', '/v1/session'],
  requires_session: true,
  production_client: false,
  rules: {
    academic_integrity: true,
    no_exam_answer_dump: true,
    model_owned_shell_authority: false,
    adb_reverse_is_not_on_device: true,
  },
};

export function assertWaikeNearbyEdgeAllowed(taskClass: string): { ok: boolean; reason: string } {
  const banned = ['exam_answer_dump', 'shell_proposal', 'computer_use', 'production_chat_default'];
  if (banned.includes(taskClass)) return { ok: false, reason: 'TASK_CLASS_FORBIDDEN' };
  return { ok: true, reason: 'OK' };
}
