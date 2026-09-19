export type Modality =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'screen'
  | 'document'
  | 'a11y_tree'
  | 'dom'
  | 'sensor';

export interface MultimodalObservationV2 {
  observation_id: string;
  modalities: Modality[];
  payloads: Partial<Record<Modality, { bytes_estimate: number; summary: string; trust: 'trusted' | 'untrusted' }>>;
  captured_at: string;
  device_budget: { max_bytes: number; max_modalities: number };
}

export interface ModalitySheddingResult {
  observation: MultimodalObservationV2;
  shed: Modality[];
  kept: Modality[];
  reason: string;
}

const PRIORITY: Modality[] = ['text', 'a11y_tree', 'dom', 'document', 'image', 'screen', 'audio', 'video', 'sensor'];

export class MultimodalObservationManager {
  create(
    payloads: MultimodalObservationV2['payloads'],
    device_budget: MultimodalObservationV2['device_budget'],
  ): MultimodalObservationV2 {
    return {
      observation_id: `obs_${Date.now()}`,
      modalities: Object.keys(payloads) as Modality[],
      payloads,
      captured_at: new Date().toISOString(),
      device_budget,
    };
  }

  shed(obs: MultimodalObservationV2): ModalitySheddingResult {
    const ordered = [...PRIORITY].filter((m) => obs.modalities.includes(m));
    const kept: Modality[] = [];
    const shed: Modality[] = [];
    let bytes = 0;
    for (const m of ordered) {
      const p = obs.payloads[m];
      if (!p) continue;
      if (kept.length >= obs.device_budget.max_modalities || bytes + p.bytes_estimate > obs.device_budget.max_bytes) {
        shed.push(m);
      } else {
        kept.push(m);
        bytes += p.bytes_estimate;
      }
    }
    const payloads: MultimodalObservationV2['payloads'] = {};
    for (const m of kept) payloads[m] = obs.payloads[m];
    return {
      observation: { ...obs, modalities: kept, payloads },
      shed,
      kept,
      reason: shed.length ? 'BUDGET_SHED' : 'WITHIN_BUDGET',
    };
  }
}
