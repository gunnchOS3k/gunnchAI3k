import {
  assertModePermission,
  createModeSession,
  MODE_PERMISSIONS,
  PermissionError,
} from '../../src/waike-mastery/modes';
import { runKeyLeakCanary } from '../../src/waike-mastery/canary';
import { diagnose, runRemediationLoop } from '../../src/waike-mastery/diagnosis';
import { proposeGradeAssist, runEducatorCopilot } from '../../src/waike-mastery/educator';
import { discoverCoursesFromContract, resolveWaikeRoot } from '../../src/waike-mastery/contract';
import {
  assertNoFalseMasteryPass,
  buildMasteryTokens,
  FORBIDDEN_SMOKE_BAR,
  MASTERY_001_NINE_COURSE_BASELINE,
  MASTERY_OVERALL_MIN,
} from '../../src/waike-mastery/tokens';
import { assertNoDemeaningLabels, createStudentModel } from '../../src/waike-mastery/student_model';
import { runCourseHonesty } from '../../src/waike-mastery/course_honesty';

describe('AI-WAIKE-MASTERY-002 honesty + discovery', () => {
  it('hard-separates instructor key access', () => {
    expect(MODE_PERMISSIONS.MASTERY_BENCHMARK.mayReadInstructorKeys).toBe(false);
    expect(MODE_PERMISSIONS.LEARNER_TUTOR.mayReadInstructorKeys).toBe(false);
    expect(MODE_PERMISSIONS.EDUCATOR_COPILOT.mayReadInstructorKeys).toBe(true);
    expect(() => assertModePermission('MASTERY_BENCHMARK', 'read_instructor_keys')).toThrow(PermissionError);
    expect(() => assertModePermission('MASTERY_BENCHMARK', 'self_grade')).toThrow(PermissionError);
    expect(createModeSession('EDUCATOR_COPILOT').permissions.hitlGradingRequired).toBe(true);
  });

  it('demotes mastery PASS; infra smoke is separate; REAL_* stay false', () => {
    const t = buildMasteryTokens({
      masteryPass: false,
      infraSmoke: true,
      corpusDiscoveryPass: true,
      noKeyLeakPass: true,
    });
    expect(t.WAIKE_AI_DIGITAL_MASTERY_PASS).toBe(false);
    expect(t.AI_WAIKE_MASTERY_EVAL).toBe(false);
    expect(t.AI_WAIKE_MASTERY_INFRA_SMOKE_PASS).toBe(true);
    expect(t.WAIKE_AI_STUDENT_CORPUS_DISCOVERY_PASS).toBe(true);
    expect(t.WAIKE_AI_NO_KEY_LEAK_PASS).toBe(true);
    expect(t.MASTERY_001_NINE_COURSE_BASELINE).toBe(0.6442307692307693);
    expect(t.REAL_STUDENT).toBe(false);
    expect(t.REAL_TEACHER).toBe(false);
    expect(t.HUMAN_E6).toBe(false);
    expect(t.ACCREDITED).toBe(false);
    expect(MASTERY_001_NINE_COURSE_BASELINE).toBe(0.6442307692307693);
  });

  it('blocks false mastery PASS at 0.55 smoke bar', () => {
    expect(() => assertNoFalseMasteryPass(FORBIDDEN_SMOKE_BAR, true)).toThrow(/FALSE_MASTERY_PASS/);
    expect(() => assertNoFalseMasteryPass(0.64, true)).toThrow(/FALSE_MASTERY_PASS/);
    expect(() => assertNoFalseMasteryPass(MASTERY_OVERALL_MIN, true)).not.toThrow();
    expect(() => assertNoFalseMasteryPass(0.64, false)).not.toThrow();
  });

  it('canary uses canary_text, feeds discovery, proves refusal', () => {
    const canary = runKeyLeakCanary(process.cwd());
    expect(canary.permissionBlocked).toBe(true);
    expect(canary.canaryTextUsed).toBe(true);
    expect(canary.feedAttempted).toBe(true);
    expect(canary.solverDiscoveryRefused).toBe(true);
    expect(canary.leakedToMasteryMode).toBe(false);
    expect(canary.pass).toBe(true);

    const d = diagnose({ learnerRef: 'opaque-1', courseId: 'SOFTWARE_BUILDER', itemId: 'x', week: 2 });
    expect(runRemediationLoop(d).finalEvidenceState).not.toBe('CERTAINLY_FILLED');
    expect(runRemediationLoop(d, { reassessScore: 0.9, transferOk: true }).finalEvidenceState).toBe(
      'CERTAINLY_FILLED',
    );

    const edu = runEducatorCopilot('SOFTWARE_BUILDER', 'grading_assist');
    expect(edu.publishWithoutHumanBlocked).toBe(true);
    expect(proposeGradeAssist('SOFTWARE_BUILDER', 0.7).published).toBe(false);
  });

  it('rejects demeaning student labels', () => {
    expect(() => createStudentModel('a@b.com')).toThrow(/opaque/);
    expect(() => assertNoDemeaningLabels('you are dumb')).toThrow(/demeaning/);
  });

  it('discovers current WAIKE 12-course universe dynamically', () => {
    const root = resolveWaikeRoot(process.cwd());
    if (!root) {
      console.warn('WAIKE repo not adjacent — skipping discovery assert');
      return;
    }
    const d = discoverCoursesFromContract(root);
    expect(d.hardcoded_course_names).toBe(false);
    expect(d.course_count).toBeGreaterThanOrEqual(12);
    const ids = new Set(d.courses.map((c) => c.course_id));
    expect(ids.has('WIRELESS_6G')).toBe(true);
    expect(ids.has('ROBOTICS_CONTROL')).toBe(true);
    expect(ids.has('GAME_DEV_INTERACTIVE')).toBe(true);
    expect(runCourseHonesty(root).pass).toBe(true);
  });
});
