import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GovernanceRuntime } from '../../src/system-layer/product_service/governance';

describe('Continuance VI GovernanceRuntime', () => {
  let tmp: string;
  let gov: GovernanceRuntime;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gunnchai-gov-'));
    gov = new GovernanceRuntime(process.cwd(), {
      storeDir: tmp,
      modelVersion: 'test@1',
    });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('enforces purpose, consent, minimization, disclosure, override, fallback, monitor, rollback', () => {
    gov.declarePurpose('Local tutoring assist only');
    gov.setConsent(false);
    gov.setMinimization({ maxQueryChars: 200, stripPiiHints: true });
    gov.setSafeFallback(true);

    const decision = gov.decide({
      capability: 'tutoring',
      query: 'teach binary search contact me at student@example.com please',
      processingMode: 'local-only',
    });
    expect(decision.purposeDeclared).toBe(true);
    expect(decision.consentGranted).toBe(false);
    expect(decision.minimizationApplied).toBe(true);
    expect(decision.minimizedQuery).toContain('[redacted-email]');
    expect(decision.minimizedQuery).not.toContain('student@example.com');
    expect(decision.disclosure).toMatch(/LOCAL-ONLY/i);
    expect(decision.fallbackSafe).toBe(true);
    expect(decision.modelVersion).toBe('test@1');
    expect(decision.evalBaselineRef).toContain('fixtures/system-layer/eval');

    gov.setHumanOverride(true, 'deny cloud exfiltration');
    const blocked = gov.decide({
      capability: 'code',
      query: 'hello',
    });
    expect(blocked.blocked).toBe(true);

    const snapBefore = gov.snapshot('before-flip');
    gov.setConsent(true);
    expect(gov.getState().userCloudConsent).toBe(true);
    gov.rollback(snapBefore);
    expect(gov.getState().userCloudConsent).toBe(false);

    gov.record('test', 'monitor event', true, 'tutoring');
    expect(gov.recentEvents(5).some((e) => e.kind === 'test')).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'monitor.jsonl'))).toBe(true);
  });

  it('rolls back model versions from history', () => {
    expect(gov.getState().modelVersionHistory).toEqual(['test@1']);
    gov.setModelVersion('test@2');
    gov.setModelVersion('test@3');
    expect(gov.getState().activeModelVersion).toBe('test@3');
    gov.rollbackModel('test@1');
    expect(gov.getState().activeModelVersion).toBe('test@1');
    expect(gov.getState().modelVersionHistory[0]).toBe('test@1');
  });
});
