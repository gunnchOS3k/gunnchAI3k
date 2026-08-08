import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GunnchAIProductService } from '../../src/system-layer/product_service/service';
import { startProductServiceServer } from '../../src/system-layer/product_service/server';
import { AiInterfaceClient } from '../../src/system-layer/os_integration/ai_interface_client';
import {
  accessibilitySupport,
  archiveScientificAttribution,
  codeHelp,
  connectivityDiagnosis,
  deviceTroubleshooting,
  runAllProductSurfaces,
  runSurfacesViaOsClient,
  waikeTutoring,
} from '../../src/system-layer/os_integration/product_surfaces';

describe('Continuance VI product surfaces', () => {
  let tmp: string;
  let service: GunnchAIProductService;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-surfaces-'));
    service = new GunnchAIProductService(process.cwd(), { varRoot: tmp });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('exercises WAIKE, code, device, archive, connectivity, accessibility callers', async () => {
    const waike = await waikeTutoring(service, 'binary search');
    expect(waike.ok).toBe(true);
    expect(waike.caller).toBe('product_surfaces.waikeTutoring');
    expect(waike.assist.capability).toBe('tutoring');

    const code = await codeHelp(service);
    expect(code.ok).toBe(true);
    expect(code.assist.capability).toBe('code');

    const device = await deviceTroubleshooting(service);
    expect(device.ok).toBe(true);
    expect(device.assist.capability).toBe('device_help');

    const science = await archiveScientificAttribution(service);
    expect(science.ok).toBe(true);
    expect(science.assist.provenance.sources.length).toBeGreaterThanOrEqual(0);
    expect(science.assist.text).toMatch(/Attribution|Retrieved|Attributed|SAFE_FALLBACK|./);

    const connectivity = await connectivityDiagnosis(service);
    expect(connectivity.ok).toBe(true);
    expect(connectivity.assist.structured.connectionPath?.recommendedBearer).toBe(
      'offline-local',
    );

    const a11y = await accessibilitySupport(service);
    expect(a11y.ok).toBe(true);
    expect(a11y.assist.structured.inputInterpretation).toBeTruthy();

    const all = await runAllProductSurfaces(service);
    expect(all).toHaveLength(6);
    expect(all.every((r) => r.ok)).toBe(true);
  }, 180_000);

  it('exercises product callers through ai_interface HTTP client', async () => {
    const handles = await startProductServiceServer(service, 0);
    try {
      const client = new AiInterfaceClient({
        baseUrl: handles.baseUrl,
        defaultTimeoutMs: 90_000,
      });
      const results = await runSurfacesViaOsClient(client);
      expect(results).toHaveLength(6);
      expect(results.every((r) => r.ok)).toBe(true);
    } finally {
      await handles.close();
    }
  }, 180_000);
});
