import * as fs from 'node:fs';
import * as path from 'node:path';
import { discoverCoursesFromContract, resolveWaikeRoot } from '../../src/waike-mastery/contract';
import {
  assertModePermission,
  MODE_PERMISSIONS,
  PermissionError,
} from '../../src/waike-mastery/modes';
import { routeSkillQuery } from '../../src/tutor/skillRouter';
import { listTutorCards } from '../../src/tutor/waikeTutorCards';
import { evaluateSourceGrounding } from '../../src/tutor/sourcePolicy';
import { FRONTIER_PARITY_TOKEN } from '../../src/user-ready/tokens';
import { buildMasteryTokens } from '../../src/waike-mastery/tokens';

describe('WAIKE → gunnchAI journey (mocks labeled)', () => {
  it('keeps learner mode off instructor keys and blocks self-grade', () => {
    expect(MODE_PERMISSIONS.LEARNER_TUTOR.mayReadInstructorKeys).toBe(false);
    expect(MODE_PERMISSIONS.LEARNER_TUTOR.maySelfGrade).toBe(false);
    expect(MODE_PERMISSIONS.EDUCATOR_COPILOT.mayReadInstructorKeys).toBe(true);
    expect(MODE_PERMISSIONS.EDUCATOR_COPILOT.mayPublishGradesWithoutHuman).toBe(false);
    expect(MODE_PERMISSIONS.EDUCATOR_COPILOT.hitlGradingRequired).toBe(true);
    expect(() => assertModePermission('LEARNER_TUTOR', 'read_instructor_keys')).toThrow(PermissionError);
  });

  it('labels Discord tutor cards as hardcoded mocks, not live course.json', () => {
    const cards = listTutorCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThan(5);
    const journey = fs.readFileSync(
      path.join(__dirname, '../../docs/journeys/WAIKE_TO_GUNNCHAI.md'),
      'utf8',
    );
    expect(journey).toMatch(/\*\*MOCK\*\*/);
    expect(journey).toMatch(/waikeTutorCards/);
  });

  it('keyword-routes software questions toward WAIKE (keyword mock)', () => {
    const route = routeSkillQuery('help me with git and a rest api');
    expect(route.domainId).toBe('software_engineering');
    expect(route.repoLinks).toContain('waike-research-ops');
  });

  it('accepts waike-research-ops/ as a grounding prefix', () => {
    const decision = evaluateSourceGrounding([
      'waike-research-ops/curriculum/digital_rc/SOFTWARE_BUILDER/course.json',
    ]);
    expect(decision.grounded).toBe(true);
  });

  it('keeps frontier parity and REAL_* tokens false on the journey', () => {
    expect(FRONTIER_PARITY_TOKEN).toBe('GUNNCHAI_FRONTIER_PRODUCT_PARITY');
    const tokens = buildMasteryTokens({
      masteryPass: false,
      infraSmoke: true,
      corpusDiscoveryPass: true,
      noKeyLeakPass: true,
    });
    expect(tokens.GUNNCHAI_FRONTIER_PRODUCT_PARITY).toBe(false);
    expect(tokens.REAL_STUDENT).toBe(false);
    expect(tokens.REAL_TEACHER).toBe(false);
  });

  it('discovers digital-RC courses when the sibling repo is present (REAL)', () => {
    const root = resolveWaikeRoot();
    if (!root) {
      console.warn('WAIKE sibling absent — discovery SKIP (not fail)');
      return;
    }
    const discovered = discoverCoursesFromContract(root);
    expect(discovered.hardcoded_course_names).toBe(false);
    expect(discovered.course_count).toBeGreaterThanOrEqual(12);
    const ids = discovered.courses.map((c) => c.course_id);
    expect(ids).toContain('SOFTWARE_BUILDER');
    const software = discovered.courses.find((c) => c.course_id === 'SOFTWARE_BUILDER');
    expect(software?.weeks).toBeGreaterThanOrEqual(8);
    expect(software?.lab_ids.length).toBeGreaterThan(0);
  });
});
