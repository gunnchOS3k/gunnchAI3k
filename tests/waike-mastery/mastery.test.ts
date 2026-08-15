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
import { buildMasteryTokens } from '../../src/waike-mastery/tokens';
import { assertNoDemeaningLabels, createStudentModel } from '../../src/waike-mastery/student_model';

describe('AI-WAIKE-MASTERY modes', () => {
  it('hard-separates instructor key access', () => {
    expect(MODE_PERMISSIONS.MASTERY_BENCHMARK.mayReadInstructorKeys).toBe(false);
    expect(MODE_PERMISSIONS.LEARNER_TUTOR.mayReadInstructorKeys).toBe(false);
    expect(MODE_PERMISSIONS.EDUCATOR_COPILOT.mayReadInstructorKeys).toBe(true);
    expect(() => assertModePermission('MASTERY_BENCHMARK', 'read_instructor_keys')).toThrow(PermissionError);
    expect(() => assertModePermission('MASTERY_BENCHMARK', 'self_grade')).toThrow(PermissionError);
    expect(createModeSession('EDUCATOR_COPILOT').permissions.hitlGradingRequired).toBe(true);
  });

  it('keeps honesty tokens false for human/accredited claims', () => {
    const t = buildMasteryTokens(true);
    expect(t.REAL_STUDENT).toBe(false);
    expect(t.REAL_TEACHER).toBe(false);
    expect(t.HUMAN_E6).toBe(false);
    expect(t.ACCREDITED).toBe(false);
    expect(t.WAIKE_AI_DIGITAL_MASTERY_PASS).toBe(true);
  });

  it('runs canary + diagnosis + educator HITL', () => {
    const canary = runKeyLeakCanary(process.cwd());
    expect(canary.permissionBlocked).toBe(true);
    expect(canary.leakedToMasteryMode).toBe(false);

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

  it('discovers WAIKE courses without hardcoding nine names when repo present', () => {
    const root = resolveWaikeRoot(process.cwd());
    if (!root) {
      console.warn('WAIKE repo not adjacent — skipping discovery assert');
      return;
    }
    const d = discoverCoursesFromContract(root);
    expect(d.hardcoded_course_names).toBe(false);
    expect(d.course_count).toBeGreaterThanOrEqual(9);
  });
});
