/**
 * CX0 Capability Broker contract types (additive scaffold).
 * Normative runtime target remains product-service assist.
 * This module does not remove or replace existing surfaces.
 */

export type BrokerRouting =
  | "local_llm"
  | "deterministic"
  | "hybrid"
  | "rag"
  | "cloud"
  | "reject";

export type BrokerAdapter = "product_service" | "stage2" | "local_runtime";

export interface CapabilityBrokerRequestV1 {
  broker_id: "gunnchai.capability_broker.v1";
  capability: string;
  request_id: string;
  routing?: BrokerRouting;
  input: unknown;
}

export interface CapabilityBrokerResponseV1 {
  broker_id: "gunnchai.capability_broker.v1";
  request_id: string;
  capability: string;
  routing: BrokerRouting;
  adapter: BrokerAdapter;
  output: unknown;
  provenance_required: true;
  claim_boundary: "contract_draft_not_runtime_complete";
}

export const NORMATIVE_ADAPTER: BrokerAdapter = "product_service";

export function mapLegacySurfaceToAdapter(
  surface: "product_service" | "stage2" | "local_runtime"
): BrokerAdapter {
  return surface;
}

export function buildBrokerResponse(params: {
  request_id: string;
  capability: string;
  routing: BrokerRouting;
  adapter?: BrokerAdapter;
  output: unknown;
}): CapabilityBrokerResponseV1 {
  return {
    broker_id: "gunnchai.capability_broker.v1",
    request_id: params.request_id,
    capability: params.capability,
    routing: params.routing,
    adapter: params.adapter ?? NORMATIVE_ADAPTER,
    output: params.output,
    provenance_required: true,
    claim_boundary: "contract_draft_not_runtime_complete",
  };
}
