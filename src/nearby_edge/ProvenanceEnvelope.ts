import * as crypto from 'node:crypto';

export type TransportMode = 'ADB_REVERSE' | 'LOCALHOST' | 'LOCAL_LAN_TLS';

export interface ProvenanceEnvelope {
  schema: 'gunnchai.nearby_edge.provenance.v1';
  request_id: string;
  compute_host: 'mac_nearby_edge';
  evidence_class: 'LIVE_MAC' | 'UNAVAILABLE';
  device_role: 'pixel6a_adb_client' | 'localhost_client' | 'lan_tls_client' | 'unknown';
  transport: TransportMode;
  model_id: string;
  provider_id: string;
  promotion_state: 'CONTROLLED_INTEGRATION';
  production_default: false;
  on_device_local: false;
  adb_reverse_is_not_on_device: true;
  privacy_label: 'device_local_adjacent' | 'personal' | 'sensitive';
  task_class: string;
  timestamp: string;
}

export function buildProvenance(opts: {
  transport: TransportMode;
  model_id: string;
  provider_id: string;
  task_class: string;
  privacy_label?: ProvenanceEnvelope['privacy_label'];
}): ProvenanceEnvelope {
  const device_role: ProvenanceEnvelope['device_role'] =
    opts.transport === 'ADB_REVERSE'
      ? 'pixel6a_adb_client'
      : opts.transport === 'LOCAL_LAN_TLS'
        ? 'lan_tls_client'
        : 'localhost_client';
  return {
    schema: 'gunnchai.nearby_edge.provenance.v1',
    request_id: crypto.randomUUID(),
    compute_host: 'mac_nearby_edge',
    evidence_class: 'LIVE_MAC',
    device_role,
    transport: opts.transport,
    model_id: opts.model_id,
    provider_id: opts.provider_id,
    promotion_state: 'CONTROLLED_INTEGRATION',
    production_default: false,
    on_device_local: false,
    adb_reverse_is_not_on_device: true,
    privacy_label: opts.privacy_label ?? 'device_local_adjacent',
    task_class: opts.task_class,
    timestamp: new Date().toISOString(),
  };
}
