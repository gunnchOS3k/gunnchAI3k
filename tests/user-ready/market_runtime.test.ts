import * as fs from 'node:fs';
import * as path from 'node:path';
import { classifyCompanionVsChatbot } from '../../src/user-ready/companion';
import { loadMarketBaseline, loadTaskMatrix } from '../../src/user-ready/matrix';
import { inspectModelTiers } from '../../src/user-ready/model_tiers';
import { runUserReady001Packet } from '../../src/user-ready/runtime_001';
import { runUserReadyPacket } from '../../src/user-ready/runtime';
import { socraticTurn } from '../../src/user-ready/socratic';
import { challengeImplementedFlags } from '../../src/user-ready/stub_challenge';
import {
  APP_PRODUCT_COMPLETE_TOKEN,
  FRONTIER_PARITY_TOKEN,
  HUMAN_E6_TOKEN,
  USER_READY_001_TOKEN,
  USER_READY_PACKET_TOKEN,
  VISUAL_UNAVAILABLE,
  buildUserReadyTokens,
} from '../../src/user-ready/tokens';

describe('AI-USER-READY tokens + matrix honesty', () => {
  it('keeps product-complete, frontier-parity, and HUMAN_E6 false', () => {
    const tokens = buildUserReadyTokens({ packet001: true, packet002: true });
    expect(tokens[APP_PRODUCT_COMPLETE_TOKEN]).toBe(false);
    expect(tokens[FRONTIER_PARITY_TOKEN]).toBe(false);
    expect(tokens[HUMAN_E6_TOKEN]).toBe(false);
    expect(tokens.BETTER_THAN_CHATGPT).toBe(false);
    expect(tokens.BETTER_THAN_KHANMIGO).toBe(false);
  });

  it('loads baseline + matrix with COMPLETE/PARTIAL/OPEN and no stub flags', () => {
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
        'coverage_status',
        'actual_runtime_test',
        'quality_metric',
        'privacy_requirement',
        'device_profiles',
        'evidence',
        'gap',
      ]) {
        expect(t).toHaveProperty(key);
      }
      if (t.coverage_status === 'COMPLETE') expect(t.implemented).toBe(true);
      if (t.coverage_status === 'PARTIAL') expect(t.implemented).toBe(false);
      if (t.coverage_status === 'OPEN') expect(t.implemented).toBe(false);
    }
    expect(challengeImplementedFlags(matrix.tasks)).toEqual([]);
    const complete = matrix.tasks.filter((t) => t.coverage_status === 'COMPLETE').map((t) => t.task_id);
    const partial = matrix.tasks.filter((t) => t.coverage_status === 'PARTIAL').map((t) => t.task_id);
    const open = matrix.tasks.filter((t) => t.coverage_status === 'OPEN').map((t) => t.task_id);
    expect(complete).toEqual(
      expect.arrayContaining([
        'AI-UR-001',
        'AI-UR-002',
        'AI-UR-003',
        'AI-UR-004',
        'AI-UR-005',
        'AI-UR-006',
        'AI-UR-007',
        'AI-UR-008',
        'AI-UR-013',
        'AI-UR-016',
      ]),
    );
    expect(complete).not.toContain('AI-UR-009');
    expect(complete).not.toContain('AI-UR-010');
    expect(complete).not.toContain('AI-UR-011');
    expect(complete).not.toContain('AI-UR-012');
    expect(complete).not.toContain('AI-UR-014');
    expect(complete).not.toContain('AI-UR-015');
    expect(partial.sort()).toEqual([
      'AI-UR-009',
      'AI-UR-010',
      'AI-UR-011',
      'AI-UR-012',
      'AI-UR-014',
      'AI-UR-015',
    ]);
    expect(open).toEqual([]);
    expect(complete).toHaveLength(10);
  });

  it('labels Nano as fallback only; Fast never uses 135M; Pro uses pinned hashed candidate', () => {
    const tiers = inspectModelTiers();
    expect(tiers.nano.isNanoFallbackOnly).toBe(true);
    expect(tiers.nano.weightsStatus).toBe('NANO_FALLBACK_ONLY');
    expect(tiers.localFast.license).toMatch(/Apache/i);
    expect(tiers.localPro.license).toMatch(/Apache/i);
    expect(tiers.localFast.isNanoFallbackOnly).toBe(false);
    if (tiers.localFast.weightsStatus === 'PRESENT') {
      expect(tiers.localFast.ggufFile).toMatch(/360/i);
      expect(tiers.localFast.ggufFile).not.toMatch(/135/i);
    } else {
      expect(tiers.localFast.weightsStatus).toBe('ABSENT');
    }
    expect(tiers.localPro.candidate).toMatch(/Qwen2\.5-1\.5B/i);
    if (tiers.localPro.weightsStatus === 'PRESENT') {
      expect(tiers.localPro.sha256).toBe(
        '1adf0b11065d8ad2e8123ea110d1ec956dab4ab038eab665614adba04b6c3370',
      );
    } else {
      expect(tiers.localPro.weightsStatus).toMatch(/OPEN|ABSENT/);
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
});

describe('AI-USER-READY-001 packet CLI runtime', () => {
  it('evaluates AI-UR-001..006 only and writes 001 result without Fast', async () => {
    const report = await runUserReady001Packet(process.cwd());
    expect(report.packet).toBe('AI-USER-READY-001');
    expect(report.tokens[USER_READY_001_TOKEN]).toBe(true);
    expect(report.tokens[USER_READY_PACKET_TOKEN]).toBe(false);
    expect(report.allImplementedPassed).toBe(true);
    expect(report.results.map((r) => r.task_id).sort()).toEqual(
      ['AI-UR-001', 'AI-UR-002', 'AI-UR-003', 'AI-UR-004', 'AI-UR-005', 'AI-UR-006'].sort(),
    );
    expect(
      fs.existsSync(path.join(process.cwd(), 'artifacts', 'user-ready', 'AI_USER_READY_001_RESULT.json')),
    ).toBe(true);
  }, 60_000);
});

describe('AI-USER-READY-002 market packet', () => {
  it('runs COMPLETE runtimes; 011 stays PARTIAL (OCR heuristics ≠ VLM); digital pass only requires COMPLETE', async () => {
    const report = await runUserReadyPacket(process.cwd(), {
      fastNetworkConsent: process.env.GUNNCHAI_FAST_NETWORK_CONSENT === '1',
    });
    expect(report.packet).toBe('AI-USER-READY-002');
    expect(report.tokens[APP_PRODUCT_COMPLETE_TOKEN]).toBe(false);
    expect(report.tokens[FRONTIER_PARITY_TOKEN]).toBe(false);
    expect(report.tokens[HUMAN_E6_TOKEN]).toBe(false);
    expect(report.pixels).toBe(VISUAL_UNAVAILABLE);
    expect(report.stubChallengeFailures).toEqual([]);
    expect(report.coverage.required).toBe(16);
    // Matrix living (004 remediated): 10 COMPLETE / 6 PARTIAL / 0 OPEN.
    expect(report.coverage.complete).toBe(10);
    expect(report.coverage.partial).toBe(6);
    expect(report.coverage.open).toBe(0);
    expect(report.coverage.implemented).toBe(10);
    expect(report.coverage.partial_ids.sort()).toEqual([
      'AI-UR-009',
      'AI-UR-010',
      'AI-UR-011',
      'AI-UR-012',
      'AI-UR-014',
      'AI-UR-015',
    ]);
    expect(report.coverage.open_ids).toEqual([]);
    const completePass = report.results.filter((r) =>
      ['AI-UR-001', 'AI-UR-002', 'AI-UR-003', 'AI-UR-004', 'AI-UR-005', 'AI-UR-006'].includes(r.task_id),
    );
    expect(completePass.every((r) => r.passed)).toBe(true);
    for (const id of ['AI-UR-007', 'AI-UR-013']) {
      const row = report.results.find((r) => r.task_id === id);
      expect(row).toBeTruthy();
      expect(row!.passed).toBe(true);
    }
    const vision = report.results.find((r) => r.task_id === 'AI-UR-011');
    expect(vision).toBeTruthy();
    expect(vision!.passed).toBe(true);
    expect(String(vision!.evidence.stack)).toBe('ocr_layout_heuristics');
    expect(String(vision!.evidence.completeness)).toBe('PARTIAL');
    const fast = report.results.find((r) => r.task_id === 'AI-UR-016');
    if (fast?.passed) {
      expect(report.allImplementedPassed).toBe(true);
      expect(report.tokens[USER_READY_PACKET_TOKEN]).toBe(true);
      expect(report.coverage.runtime).toBeGreaterThanOrEqual(7);
    } else {
      expect(fast?.notes).toMatch(/FAST_WEIGHTS_UNAVAILABLE|LLAMA_CLI_ABSENT|OFFLINE|absent|ABSENT/i);
    }
    expect(
      fs.existsSync(path.join(process.cwd(), 'artifacts', 'user-ready', 'AI_USER_READY_002_RESULT.json')),
    ).toBe(true);
  }, 360_000);
});
