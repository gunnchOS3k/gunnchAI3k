import * as fs from 'node:fs';
import * as path from 'node:path';
import { classifyCompanionVsChatbot } from '../../src/user-ready/companion';
import { loadMarketBaseline, loadTaskMatrix } from '../../src/user-ready/matrix';
import { inspectModelTiers } from '../../src/user-ready/model_tiers';
import { runUserReadyPacket } from '../../src/user-ready/runtime';
import { socraticTurn } from '../../src/user-ready/socratic';
import { challengeImplementedFlags } from '../../src/user-ready/stub_challenge';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_PACKET_TOKEN,
  VISUAL_UNAVAILABLE,
  buildUserReadyTokens,
} from '../../src/user-ready/tokens';

describe('AI-USER-READY-001 market packet', () => {
  it('keeps product-complete, frontier-parity, and HUMAN_E6 false', () => {
    const tokens = buildUserReadyTokens(true);
    expect(tokens[APP_PRODUCT_COMPLETE_TOKEN]).toBe(false);
    expect(tokens[FRONTIER_PARITY_TOKEN]).toBe(false);
    expect(tokens[HUMAN_E6_TOKEN]).toBe(false);
    expect(tokens.BETTER_THAN_CHATGPT).toBe(false);
    expect(tokens.BETTER_THAN_KHANMIGO).toBe(false);
  });

  it('loads baseline + matrix with required fields and no stub implemented flags', () => {
    const baseline = loadMarketBaseline();
    expect(baseline.schema).toBe('gunnchai.market_ai_capability_baseline.v1');
    const products = baseline.products as Array<{ id: string; capability_classes: unknown[] }>;
    const ids = products.map((p) => p.id).sort();
    expect(ids).toEqual(
      ['chatgpt', 'claude', 'gemini', 'github_copilot', 'khanmigo', 'notebooklm', 'perplexity'].sort(),
    );

    const matrix = loadTaskMatrix();
    expect(matrix.schema).toBe('gunnchai.market_task_matrix.v1');
    expect(matrix.tasks.length).toBeGreaterThanOrEqual(16);
    for (const t of matrix.tasks) {
      for (const key of [
        'task_id',
        'category',
        'market_examples',
        'local_required',
        'cloud_optional',
        'implemented',
        'actual_runtime_test',
        'quality_metric',
        'privacy_requirement',
        'device_profiles',
        'evidence',
        'gap',
      ]) {
        expect(t).toHaveProperty(key);
      }
    }
    expect(challengeImplementedFlags(matrix.tasks)).toEqual([]);
  });

  it('labels Fast/Pro weights ABSENT without inventing GGUFs; Nano is fallback only', () => {
    const tiers = inspectModelTiers();
    expect(tiers.nano.isNanoFallbackOnly).toBe(true);
    expect(tiers.nano.weightsStatus).toBe('NANO_FALLBACK_ONLY');
    expect(tiers.localFast.license).toMatch(/Apache/i);
    expect(tiers.localPro.license).toMatch(/Apache/i);
    if (!tiers.localFast.ggufFile) {
      expect(tiers.localFast.weightsStatus).toBe('ABSENT');
    }
    if (!tiers.localPro.ggufFile) {
      expect(tiers.localPro.weightsStatus).toBe('ABSENT');
    }
  });

  it('Socratic engine never leaks a withheld answer', () => {
    const secret = 'MIDPOINT_IS_LO_PLUS_HI_SHIFT';
    const turn = socraticTurn({
      message: 'just tell me the answer',
      topic: 'binary search',
      withheldAnswer: secret,
    });
    expect(turn.revealedAnswer).toBe(false);
    expect(turn.text).not.toContain(secret);
    expect(turn.questions.length).toBeGreaterThan(0);
  });

  it('companion heuristic is VISUAL UNAVAILABLE without pixels', () => {
    const generic = classifyCompanionVsChatbot('tell me a joke');
    expect(generic.kind).toBe('chatbot');
    expect(generic.pixels).toBe(VISUAL_UNAVAILABLE);
    const companion = classifyCompanionVsChatbot('tutor me on this device wifi issue');
    expect(companion.kind).toBe('companion');
    expect(companion.visualAvailable).toBe(false);
  });

  it('runs the implemented market-task subset with real runtime', async () => {
    const report = await runUserReadyPacket(process.cwd());
    expect(report.tokens[APP_PRODUCT_COMPLETE_TOKEN]).toBe(false);
    expect(report.tokens[FRONTIER_PARITY_TOKEN]).toBe(false);
    expect(report.tokens[HUMAN_E6_TOKEN]).toBe(false);
    expect(report.pixels).toBe(VISUAL_UNAVAILABLE);
    expect(report.stubChallengeFailures).toEqual([]);
    const failed = report.results.filter((r) => !r.passed).map((r) => r.task_id);
    expect(failed).toEqual([]);
    expect(report.allImplementedPassed).toBe(true);
    expect(report.tokens[USER_READY_PACKET_TOKEN]).toBe(true);
    expect(report.coverage.required).toBe(16);
    expect(report.coverage.implemented).toBe(6);
    expect(report.coverage.runtime).toBe(6);
    expect(report.coverage.offline).toBe(6);
    expect(report.coverage.gap).toBe(10);
    expect(report.coverage.cloud_only).toBeGreaterThanOrEqual(1);
    expect(
      fs.existsSync(path.join(process.cwd(), 'artifacts', 'user-ready', 'AI_USER_READY_001_RESULT.json')),
    ).toBe(true);
  }, 30_000);
});
