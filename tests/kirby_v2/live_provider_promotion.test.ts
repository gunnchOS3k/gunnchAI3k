import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildProvenanceDoc, LIVE_CANDIDATES } from '../../benchmarks/frontier_live/provenance';
import { captureMacBaseline, capturePixelBaseline } from '../../benchmarks/frontier_live/preflight';
import { runLivePromotion } from '../../benchmarks/frontier_live/run_live_promotion';

const ROOT = path.resolve(__dirname, '../..');

describe('Kirby live provider promotion (KIRBY-3)', () => {
  test('evidence rebind doc distinguishes SIMULATED vs LIVE classes', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/frontier/KIRBY2_LIVE_EVIDENCE_REBIND.md'), 'utf8');
    for (const token of ['SIMULATED', 'LIVE_MAC', 'LIVE_PIXEL', 'LIVE_REMOTE', 'LIVE_QUALIFIED']) {
      expect(doc).toContain(token);
    }
    expect(doc).toMatch(/never.*LIVE_QUALIFIED|Simulated adapters are never/i);
  });

  test('provenance gate rejects unknown licenses and lists only approved candidates', () => {
    const doc = buildProvenanceDoc();
    expect(doc.policy.unknown_license_weights_forbidden).toBe(true);
    expect(doc.approved_for_download.length).toBeGreaterThan(0);
    expect(LIVE_CANDIDATES.every((c) => c.license_ok && c.license === 'Apache-2.0')).toBe(true);
    expect(LIVE_CANDIDATES.every((c) => !/7B|7b|13B/.test(c.parameters))).toBe(true);
  });

  test('pixel preflight records ADB connect state honestly', () => {
    const pixel = capturePixelBaseline();
    expect(pixel.schema).toBe('kirby.live.pixel_baseline.v1');
    expect(typeof pixel.PIXEL6A_ADB_CONNECTED).toBe('boolean');

    const artifactPath = path.join(ROOT, 'artifacts/kirby_v2/live/pixel6a/PIXEL_BASELINE.json');
    expect(fs.existsSync(artifactPath)).toBe(true);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    // Research evidence: either live ADB works now, or committed baseline proves prior authorize.
    const connected = pixel.PIXEL6A_ADB_CONNECTED || artifact.PIXEL6A_ADB_CONNECTED === true;
    expect(connected).toBe(true);
    if (pixel.PIXEL6A_ADB_CONNECTED) {
      expect(pixel.classification).toBe('PIXEL_READY');
      expect(pixel.fail_closed).toBe(false);
      if (!pixel.on_device_runtime?.llama_cli && !pixel.on_device_runtime?.ollama) {
        expect(pixel.on_device_inference_possible).toBe(false);
      }
    } else {
      expect(artifact.classification).toBe('PIXEL_READY');
      expect(artifact.PIXEL6A_ADB_CONNECTED).toBe(true);
      expect(artifact.on_device_inference_possible).toBe(false);
    }

    const local = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'artifacts/kirby_v2/live/pixel6a/PIXEL_LOCAL_MODEL_STATUS.json'), 'utf8'),
    );
    expect(local.PIXEL6A_LIVE_LOCAL_MODEL_PASS).toBe(false);
    expect(local.adb_forwarded_mac_not_claimed_as_pixel).toBe(true);
  });

  test('mac baseline captures host facts', () => {
    const mac = captureMacBaseline();
    expect(mac.host.memsize_gb).toBeGreaterThan(0);
    expect(mac.runtimes.node.present).toBe(true);
  });

  test(
    'end-to-end live promotion writes artifacts and never marks sim as LIVE_QUALIFIED',
    async () => {
      const result = await runLivePromotion(ROOT);
      const required = [
        'host/MAC_BASELINE.json',
        'pixel6a/PIXEL_BASELINE.json',
        'CANDIDATE_INVENTORY.json',
        'MODEL_PROVENANCE.json',
        'qualification_matrix_live.md',
        'LIVE_SUMMARY.json',
      ];
      for (const f of required) {
        expect(fs.existsSync(path.join(result.outDir, f))).toBe(true);
      }
      expect(fs.existsSync(path.join(ROOT, 'docs/frontier/PIXEL6A_INFERENCE_RUNTIME_DECISION.md'))).toBe(true);

      const qGlob = path.join(result.outDir, 'qualification/live');
      expect(fs.existsSync(qGlob)).toBe(true);

      // Simulated bake-off artifacts untouched as sim
      const bakeoffQ = path.join(ROOT, 'artifacts/kirby_v2/bakeoff/qualification_matrix.json');
      if (fs.existsSync(bakeoffQ)) {
        const sim = JSON.parse(fs.readFileSync(bakeoffQ, 'utf8'));
        for (const row of sim.qualifications || []) {
          if (row.evidence_mode === 'simulated_deterministic') {
            expect(row.promotion_state).not.toBe('LIVE_QUALIFIED');
          }
        }
      }

      const pixelLocal = JSON.parse(
        fs.readFileSync(path.join(result.outDir, 'pixel6a/PIXEL_LOCAL_MODEL_STATUS.json'), 'utf8'),
      );
      expect(pixelLocal.PIXEL6A_LIVE_LOCAL_MODEL_PASS).toBe(false);
      expect(pixelLocal.adb_forwarded_mac_not_claimed_as_pixel).toBe(true);

      expect(result.nextAction).toMatch(/^NEXT_GUNNCHAI_ACTION=/);
    },
    900_000,
  );
});
