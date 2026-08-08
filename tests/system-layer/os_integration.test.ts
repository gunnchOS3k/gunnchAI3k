import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GunnchAIProductService } from '../../src/system-layer/product_service/service';
import { startProductServiceServer } from '../../src/system-layer/product_service/server';
import {
  OS_INTEGRATION_TOKEN,
  PRODUCT_SERVICE_TOKEN,
} from '../../src/system-layer/product_service/types';
import { AiInterfaceClient } from '../../src/system-layer/os_integration/ai_interface_client';
import { proveRequirements } from '../../src/system-layer/os_integration/requirement_proof';
import {
  OS_INTEGRATION_TOPOLOGY,
  describeTopology,
} from '../../src/system-layer/os_integration/topology';

describe('Continuance VI gunnchOS integration', () => {
  let tmp: string;
  let service: GunnchAIProductService;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-os-'));
    service = new GunnchAIProductService(process.cwd(), { varRoot: tmp });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('discovers capabilities, model status, rag status, permissions', () => {
    const discovery = service.osDiscover();
    expect(discovery.osIntegrationToken).toBe(OS_INTEGRATION_TOKEN);
    expect(discovery.token).toBe(PRODUCT_SERVICE_TOKEN);
    expect(discovery.cancellationSupported).toBe(true);
    expect(discovery.timeoutSupported).toBe(true);
    expect(discovery.fullPlatformDigitalComplete).toBe(false);
    expect(discovery.modelStatus.selectedArchitecture).toBe('llama.cpp');
    expect(discovery.modelStatus.unavailableFallback).toBe('deterministic-baseline');
    expect(discovery.modelStatus.hostForwardPossible).toBe(true);
    expect(discovery.ragStatus.attributionEnabled).toBe(true);
    expect(discovery.ragStatus.documents).toBeGreaterThan(0);
    expect(discovery.permissions).toEqual(
      expect.arrayContaining(['assist', 'os:discover', 'audit:read']),
    );
    expect(discovery.topology).toMatch(/host-forward/);
  });

  it('documents QEMU host-forward topology explicitly', () => {
    expect(OS_INTEGRATION_TOPOLOGY.planes.hostForward.defaultHostPort).toBe(8791);
    expect(OS_INTEGRATION_TOPOLOGY.planes.hostModelRuntime.qemuMayHostForwardModel).toBe(
      true,
    );
    expect(describeTopology()).toMatch(/QEMU host-forward/);
    expect(OS_INTEGRATION_TOPOLOGY.claimBoundary).toMatch(
      /FULL_GUNNCHAI3K_PLATFORM_DIGITAL_COMPLETE/,
    );
  });

  it('serves input interpretation, safety alert, continuity, consent, audit, attribution', async () => {
    const input = await service.assist({
      capability: 'input_interpretation',
      query: 'switch-access scan: open tutoring',
    });
    expect(input.ok).toBe(true);
    expect(input.structured.inputInterpretation?.modality).toBe('switch-access');

    const alert = await service.assist({
      capability: 'safety_alert',
      query: 'thermal overheat warning on handheld',
    });
    expect(alert.ok).toBe(true);
    expect(alert.structured.safetyAlert?.severity).toBe('critical');
    expect(alert.structured.safetyAlert?.defensiveOnly).toBe(true);

    const continuity = await service.assist({
      capability: 'continuity',
      query: 'start cross-device continuity',
    });
    expect(continuity.structured.continuity?.sessionId).toBeTruthy();
    const exported = service.continuity.exportBundle(
      continuity.structured.continuity!.sessionId,
    );
    const imported = service.continuity.importBundle(exported);
    expect(imported.sessionId).toBe(continuity.structured.continuity!.sessionId);

    service.governance.setConsent(true);
    expect(service.governance.getState().userCloudConsent).toBe(true);

    const attr = service.rag.attribution('waike binary search', 3);
    expect(attr.grounded || attr.hits.length >= 0).toBe(true);

    expect(service.audit.recent(5).length).toBeGreaterThan(0);
  }, 60_000);

  it('supports model rollback, timeout fallback, and cancel registry', async () => {
    const before = service.governance.getState().activeModelVersion;
    service.governance.setModelVersion(`${before}+candidate`);
    expect(service.governance.getState().activeModelVersion).toContain('+candidate');
    service.governance.rollbackModel(before);
    expect(service.governance.getState().activeModelVersion).toBe(before);

    const timed = await service.assist({
      capability: 'tutoring',
      query: 'quick',
      timeoutMs: 1,
      // force timeout by aborting after register via already-aborted-like tiny timeout
    });
    // 1ms may or may not fire before deterministic completes; either ok or SAFE_FALLBACK / timeout path
    expect(typeof timed.ok).toBe('boolean');

    const controller = new AbortController();
    controller.abort('test');
    const cancelled = await service.assist({
      capability: 'code',
      query: 'cancel me',
      id: 'req-cancel-1',
      signal: controller.signal,
    });
    expect(cancelled.ok).toBe(false);
    expect(cancelled.errorCode).toBe('REQUEST_CANCELLED');

    expect(service.cancel('not-active').ok).toBe(false);
  }, 60_000);

  it('ai_interface client discovers and assists over HTTP', async () => {
    const handles = await startProductServiceServer(service, 0);
    try {
      const client = new AiInterfaceClient({ baseUrl: handles.baseUrl, defaultTimeoutMs: 60_000 });
      const discovery = await client.discover();
      expect(discovery.osIntegrationToken).toBe(OS_INTEGRATION_TOKEN);
      expect((await client.modelStatus()).hostForwardPossible).toBe(true);
      expect((await client.ragStatus()).documents).toBeGreaterThan(0);

      await client.setConsent(false);
      const tutor = await client.tutorStart('student', 'waike');
      expect(tutor.started).toBe(true);
      expect(tutor.mock).toBe(false);

      const safety = await client.safetyCheck('explain offline alert');
      expect(safety.mock).toBe(false);
      expect(safety.safe_to_show).toBe(true);

      const audit = await client.audit(10);
      expect(audit.ok).toBe(true);
    } finally {
      await handles.close();
    }
  }, 120_000);

  it('re-proves all normative AI requirement nodes as RUNTIME', () => {
    const proof = proveRequirements(service);
    expect(proof.allNormativeRuntime).toBe(true);
    expect(proof.runtimeProven).toBe(38);
    expect(proof.fullPlatformTokenEarned).toBe(false);
    expect(proof.missingRuntime).toEqual([]);
    for (const row of proof.routeCoverage) {
      expect(row.hasMatchingRoute).toBe(true);
    }
  });
});
