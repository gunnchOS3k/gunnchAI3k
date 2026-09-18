/** gunnchOS Capsule ↔ Nearby-Edge contract v1 — integration stub for next action. */
export interface CapsuleNearbyEdgeContractV1 {
  schema: 'gunnchai.gunnchos_capsule.nearby_edge_contract.v1';
  preferred_transport: 'ADB_REVERSE' | 'LOCALHOST' | 'LOCAL_LAN_TLS';
  compute_host: 'mac_nearby_edge';
  on_device_local: false;
  requires_pairing: true;
  production_default_provider: false;
  surfaces: Array<'capsule_pilot' | 'status' | 'short_assist'>;
  rules: {
    no_unauthenticated_lan: true;
    provenance_required: true;
    reversible_via_feature_flags: true;
  };
}

export const CAPSULE_NEARBY_EDGE_CONTRACT_V1: CapsuleNearbyEdgeContractV1 = {
  schema: 'gunnchai.gunnchos_capsule.nearby_edge_contract.v1',
  preferred_transport: 'ADB_REVERSE',
  compute_host: 'mac_nearby_edge',
  on_device_local: false,
  requires_pairing: true,
  production_default_provider: false,
  surfaces: ['capsule_pilot', 'status', 'short_assist'],
  rules: {
    no_unauthenticated_lan: true,
    provenance_required: true,
    reversible_via_feature_flags: true,
  },
};

export function capsuleIntegrationReady(): {
  contract_present: true;
  wired_into_product: false;
  next: string;
} {
  return {
    contract_present: true,
    wired_into_product: false,
    next: 'NEXT_GUNNCHAI_ACTION=INTEGRATE_NEARBY_EDGE_PROVIDER_INTO_GUNNCHOS_CAPSULE_AND_WAIKE_PIXEL_PILOT',
  };
}
