import * as fs from 'node:fs';
import * as path from 'node:path';
import { runIndependentEvals } from '../../src/independent-eval/runner';
import { reviewExperience, VISUAL_UNAVAILABLE } from '../../src/independent-eval/experience';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  INDEPENDENT_EVAL_TOKEN,
  NANO_FALLBACK_LABEL,
  buildHonestTokens,
} from '../../src/independent-eval/tokens';
import { ModelRegistryService } from '../../src/system-layer/model_registry';
import { ModelFleetRegistry } from '../../src/stage2/fleet/registry';

describe('independent evals (not SmolLM2-as-final-intelligence)', () => {
  it('keeps product-complete and frontier-parity false', () => {
    const tokens = buildHonestTokens(true);
    expect(tokens[APP_PRODUCT_COMPLETE_TOKEN]).toBe(false);
    expect(tokens[FRONTIER_PARITY_TOKEN]).toBe(false);
    expect(tokens[NANO_FALLBACK_LABEL]).toBe(true);
    expect(tokens.BETTER_THAN_CHATGPT).toBe(false);
  });

  it('labels SmolLM2-135M Q4_K_M 512-ctx as Nano fallback only', () => {
    const fleet = new ModelFleetRegistry();
    const nano = fleet.byRole('NANO_LOCAL')[0];
    expect(nano.isNanoFallbackOnly).toBe(true);
    expect(nano.parameters).toMatch(/135/);

    const registry = new ModelRegistryService();
    const smol = registry.getById('smollm2-135m-instruct-q4_k_m');
    if (smol) {
      expect(smol.isNanoFallbackOnly).toBe(true);
      expect(smol.contextTokens).toBe(512);
      expect(smol.quant).toBe('Q4_K_M');
      expect(smol.description).toMatch(/Nano\/fallback only/i);
    }
    const manifestPath = path.join(process.cwd(), 'models', 'local', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
        isNanoFallbackOnly?: boolean;
        contextTokens?: number;
        role?: string;
      };
      expect(manifest.isNanoFallbackOnly).toBe(true);
      expect(manifest.contextTokens).toBe(512);
      expect(manifest.role).toBe('NANO_LOCAL');
    }
  });

  it('experience review is VISUAL UNAVAILABLE without pixels', () => {
    const review = reviewExperience();
    expect(review.pixels).toBe(VISUAL_UNAVAILABLE);
    expect(review.visualAvailable).toBe(false);
    expect(review.verdict).toMatch(/VISUAL UNAVAILABLE/);
  });

  it('runs digitally executable independent evals', async () => {
    const report = await runIndependentEvals(process.cwd(), { writeArtifacts: true });
    expect(report.ownerRepo).toBe('gunnchAI3k');
    expect(report.tokens[APP_PRODUCT_COMPLETE_TOKEN]).toBe(false);
    expect(report.tokens[FRONTIER_PARITY_TOKEN]).toBe(false);
    expect(report.audit.appProductCompleteEarned).toBe(false);
    expect(report.audit.llama.labeledNanoFallbackOnly).toBe(true);
    expect(report.experience.pixels).toBe(VISUAL_UNAVAILABLE);
    const failed = report.results.filter((r) => !r.passed).map((r) => r.id);
    expect(failed).toEqual([]);
    expect(report.allDigitalPassed).toBe(true);
    expect(report.tokens[INDEPENDENT_EVAL_TOKEN]).toBe(true);
    expect(report.results.every((r) => r.physicalPowerClaim === false)).toBe(true);
    expect(report.results.every((r) => r.digitallyExecutable)).toBe(true);
    const domains = new Set(report.results.map((r) => r.domain));
    for (const d of [
      'tutoring',
      'code',
      'troubleshooting',
      'a11y',
      'translation',
      'rag_faithfulness',
      'privacy',
      'tool_auth',
      'prompt_injection',
      'exfil',
      'memory_isolation',
      'offline',
      'latency',
    ]) {
      expect(domains.has(d)).toBe(true);
    }
  }, 30_000);
});
