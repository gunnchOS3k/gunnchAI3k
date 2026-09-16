import {
  buildBrokerResponse,
  mapLegacySurfaceToAdapter,
  NORMATIVE_ADAPTER,
} from "../../src/system-layer/cx0/capabilityBroker";

describe("CX0 Capability Broker contract", () => {
  it("keeps product_service as normative adapter", () => {
    expect(NORMATIVE_ADAPTER).toBe("product_service");
    expect(mapLegacySurfaceToAdapter("stage2")).toBe("stage2");
  });

  it("builds responses with explicit non-complete claim boundary", () => {
    const res = buildBrokerResponse({
      request_id: "r1",
      capability: "summarize",
      routing: "deterministic",
      output: { text: "ok" },
    });
    expect(res.broker_id).toBe("gunnchai.capability_broker.v1");
    expect(res.provenance_required).toBe(true);
    expect(res.claim_boundary).toBe("contract_draft_not_runtime_complete");
    expect(res.adapter).toBe("product_service");
  });
});
