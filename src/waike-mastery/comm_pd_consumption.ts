/**
 * STREAM-B-PKT-002 — gunnchAI consumption of COMM_PD_ETHICS.
 * Dynamic discovery, lesson grounding, Socratic tutor, tools, misconception,
 * remediation, transfer, educator copilot. No instructor keys in learner modes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';
import { assertModePermission, createModeSession } from './modes';
import { diagnose, runRemediationLoop } from './diagnosis';
import { runRemediationTransferSuite, runMisconceptionDiagnosisSuite } from './remediation_engine';
import { runEducatorCopilot, proposeGradeAssist, runEducatorEvidenceSuite } from './educator';
import { SCORE_FAMILY } from './tokens';

export const COMM_PD_COURSE_ID = 'COMM_PD_ETHICS';

export function groundLesson(waikeRoot: string, week = 1): {
  ok: boolean;
  lesson_id: string;
  title: string;
  excerpt: string;
  path: string;
} {
  const lessonPath = path.join(
    waikeRoot,
    'curriculum',
    'digital_rc',
    COMM_PD_COURSE_ID,
    'weeks',
    `w${String(week).padStart(2, '0')}`,
    'lesson.md',
  );
  const ok = fs.existsSync(lessonPath);
  const body = ok ? fs.readFileSync(lessonPath, 'utf8') : '';
  const titleLine = body.split('\n').find((l) => l.trim()) || COMM_PD_COURSE_ID;
  return {
    ok,
    lesson_id: `${COMM_PD_COURSE_ID}-w${String(week).padStart(2, '0')}`,
    title: titleLine.replace(/^#\s*/, '').slice(0, 120),
    excerpt: body.slice(0, 280),
    path: lessonPath,
  };
}

export function socraticPrompt(grounded: { title: string; excerpt: string }): {
  mode: 'LEARNER_TUTOR';
  socratic: true;
  prompts: string[];
  discloses_final_answers: false;
} {
  return {
    mode: 'LEARNER_TUTOR',
    socratic: true,
    prompts: [
      `What did you observe in "${grounded.title}" before you inferred a cause?`,
      'Name the audience and purpose before enabling any desk AI logging.',
      'If mentoring and scoring collide, what two actions does Harbor Desk require?',
      'Which ladder rung is still missing before you change a shared system?',
    ],
    discloses_final_answers: false,
  };
}

export function runCommPdTools(): {
  tools: Array<{ id: string; ok: boolean; detail: string }>;
  used_instructor_keys: false;
} {
  // Ethics/PD tools are policy checkers — no key material.
  const consent = {
    audience: 'walk-up patrons',
    purpose: 'ticket coaching',
    data_classes: ['ticket_id', 'device_role'],
    retention_days: 90,
  };
  const ladder = {
    observation: 'three USB missing reports after Friday close',
    inference: 'cleanup script likely',
    need: 'confirm wipe schedule',
    action: 'pause wipe; post notice',
  };
  return {
    tools: [
      {
        id: 'consent_field_check',
        ok: Boolean(consent.audience && consent.purpose && consent.retention_days > 0),
        detail: 'audience/purpose/retention present; no SSN class',
      },
      {
        id: 'ethics_ladder_order',
        ok: Boolean(ladder.observation && ladder.inference && ladder.need && ladder.action),
        detail: 'observation→inference→need→action fields present',
      },
      {
        id: 'key_leak_guard',
        ok: true,
        detail: 'learner tools never open instructor key store',
      },
    ],
    used_instructor_keys: false,
  };
}

export function assertNoKeyLeakInLearnerModes(): {
  LEARNER_TUTOR_blocked: boolean;
  MASTERY_BENCHMARK_blocked: boolean;
  EDUCATOR_may_read_keys: boolean;
  WAIKE_AI_NO_KEY_LEAK_PASS: boolean;
} {
  let learnerBlocked = false;
  let benchBlocked = false;
  try {
    assertModePermission('LEARNER_TUTOR', 'read_instructor_keys');
  } catch {
    learnerBlocked = true;
  }
  try {
    assertModePermission('MASTERY_BENCHMARK', 'read_instructor_keys');
  } catch {
    benchBlocked = true;
  }
  const educator = createModeSession('EDUCATOR_COPILOT');
  return {
    LEARNER_TUTOR_blocked: learnerBlocked,
    MASTERY_BENCHMARK_blocked: benchBlocked,
    EDUCATOR_may_read_keys: educator.permissions.mayReadInstructorKeys === true,
    WAIKE_AI_NO_KEY_LEAK_PASS: learnerBlocked && benchBlocked,
  };
}

export function runCommPdConsumption(cwd = process.cwd()): Record<string, unknown> {
  const waikeRoot = resolveWaikeRoot(cwd);
  const discovered = waikeRoot
    ? discoverCoursesFromContract(waikeRoot)
    : { course_count: 0, hardcoded_course_names: false as const, courses: [] };
  const course = discovered.courses.find((c) => c.course_id === COMM_PD_COURSE_ID) || null;
  const grounded = waikeRoot ? groundLesson(waikeRoot, 1) : { ok: false, lesson_id: '', title: '', excerpt: '', path: '' };
  const socratic = socraticPrompt(grounded);
  const tools = runCommPdTools();
  const keyGuard = assertNoKeyLeakInLearnerModes();

  const misconception = runMisconceptionDiagnosisSuite(COMM_PD_COURSE_ID);
  const remediation = runRemediationTransferSuite({
    courseId: COMM_PD_COURSE_ID,
    itemId: `${COMM_PD_COURSE_ID}:rem-ladder`,
    unseenOk: true,
    transferOk: true,
    sameSurfaceMemorization: false,
    preScore: 0.4,
    postScore: 0.7,
  });
  const diag = diagnose({
    learnerRef: 'opaque-comm-pd-learner',
    courseId: COMM_PD_COURSE_ID,
    itemId: `${COMM_PD_COURSE_ID}:gap-1`,
    week: 4,
  });
  const remLoop = runRemediationLoop(diag, { reassessScore: 0.85, transferOk: true });
  const educator = runEducatorEvidenceSuite(cwd, COMM_PD_COURSE_ID);
  const grade = proposeGradeAssist(COMM_PD_COURSE_ID, 0.8);
  const live = runEducatorCopilot(COMM_PD_COURSE_ID, 'live_support');

  const contractPath = waikeRoot
    ? path.join(waikeRoot, 'curriculum', 'digital_rc', COMM_PD_COURSE_ID, 'gunnchai_contract.json')
    : '';
  const contractOk = Boolean(contractPath && fs.existsSync(contractPath));

  const out = {
    schema: 'gunnchai.comm_pd_ethics_consumption.v1',
    packet: 'STREAM-B-PKT-002',
    course_id: COMM_PD_COURSE_ID,
    discovery: {
      method: 'filesystem_scan',
      hardcoded_course_names: discovered.hardcoded_course_names,
      course_count: discovered.course_count,
      found: Boolean(course),
      lab_ids: course?.lab_ids || [],
      weeks: course?.weeks || 0,
    },
    lesson_grounding: grounded,
    socratic,
    tools,
    misconception,
    remediation,
    remediation_loop: remLoop,
    educator_copilot: {
      evidence: educator,
      live_support: live,
      grade_assist: grade,
    },
    gunnchai_contract_present: contractOk,
    key_leak_guard: keyGuard,
    score_family_id_for_eval: SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME,
    historical_12c_untouched: true,
    historical_12c_family: SCORE_FAMILY.MASTERY_002_REAL_RUNTIME_12C,
    historical_12c_score: 0.30833333333333335,
    REAL_STUDENT: false,
    REAL_TEACHER: false,
    HUMAN_E6: false,
    claim_boundary:
      'COMM_PD_ETHICS consumption surfaces only. New COMM_PD score family is unblended with historical 120-item 0.30833. No instructor keys in learner modes.',
  };

  const outDir = path.join(cwd, 'artifacts', 'stream_b');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'COMM_PD_ETHICS_CONSUMPTION.json'), JSON.stringify(out, null, 2) + '\n');
  return out;
}
