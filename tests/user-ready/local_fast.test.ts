import * as fs from 'node:fs';
import * as path from 'node:path';
import { FAST_SHA256, ModelDownloadManager, NANO_SHA256 } from '../../src/user-ready/model_manager';
import { assertNotNanoFast, runLocalFastDirect } from '../../src/user-ready/local_fast_runtime';
import { inspectModelTiers } from '../../src/user-ready/model_tiers';

describe('AI-UR-016 Local Fast runtime', () => {
  it('never labels Nano SHA or 135M filename as Fast', () => {
    expect(() => assertNotNanoFast('SmolLM2-135M-Instruct-Q4_K_M.gguf', NANO_SHA256)).toThrow(
      /NANO_AS_FAST/,
    );
    expect(FAST_SHA256).not.toBe(NANO_SHA256);
    const tiers = inspectModelTiers();
    expect(tiers.nano.isNanoFallbackOnly).toBe(true);
    if (tiers.localFast.weightsStatus === 'PRESENT') {
      expect(tiers.localFast.sha256).toBe(FAST_SHA256);
      expect(tiers.localFast.ggufFile).not.toMatch(/135/i);
    }
    expect(tiers.localPro.weightsStatus).toMatch(/OPEN|ABSENT|PRESENT/);
  });

  it('runs real Fast inference when hashed 360M GGUF and llama-cli are present', async () => {
    const mgr = new ModelDownloadManager();
    const consent = process.env.GUNNCHAI_FAST_NETWORK_CONSENT === '1';
    const ensure = await mgr.ensure('local-fast-smollm2-360m', {
      networkConsent: consent,
      offline: !consent,
    });
    if (!ensure.ok) {
      expect(ensure.reason).toMatch(/OFFLINE_AND_ABSENT|NETWORK_CONSENT|FAST|SHA|LLAMA|OPEN/);
      return;
    }
    expect(ensure.sha256).toBe(FAST_SHA256);
    expect(ensure.bytes).toBeGreaterThan(200_000_000);
    const report = await runLocalFastDirect(process.cwd(), { networkConsent: consent });
    if (!report.llamaBinary) {
      expect(report.ok).toBe(false);
      expect(report.notes).toMatch(/LLAMA_CLI_ABSENT/);
      return;
    }
    expect(report.ok).toBe(true);
    expect(report.cases).toHaveLength(6);
    for (const c of report.cases) {
      expect(c.usedNano).toBe(false);
      expect(c.realInference).toBe(true);
      expect(c.output.trim().length).toBeGreaterThan(4);
      expect(c.observation).toMatch(/HOST_OBSERVED|GUEST_OBSERVED/);
      expect(c.latencyMs).not.toBeNull();
    }
    expect(report.modelPath && fs.existsSync(report.modelPath)).toBe(true);
    expect(path.basename(report.modelPath!)).toMatch(/360/i);
  }, 300_000);
});
