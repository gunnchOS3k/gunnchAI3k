/**
 * Course-specific honesty for WIRELESS_6G / ROBOTICS / GAME_DEV.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

function blob(waikeRoot: string, courseId: string): string {
  const base = path.join(waikeRoot, 'curriculum', 'digital_rc', courseId);
  const parts: string[] = [];
  for (const rel of ['course.json', 'syllabus.md', 'student/STUDENT_PACKET.md']) {
    const p = path.join(base, rel);
    if (fs.existsSync(p)) parts.push(fs.readFileSync(p, 'utf8'));
  }
  const weeks = path.join(base, 'weeks');
  if (fs.existsSync(weeks)) {
    for (const w of fs.readdirSync(weeks).sort()) {
      const lesson = path.join(weeks, w, 'lesson.md');
      if (fs.existsSync(lesson)) parts.push(fs.readFileSync(lesson, 'utf8'));
    }
  }
  return parts.join('\n').toLowerCase();
}

export function runCourseHonesty(waikeRoot: string | null): {
  pass: boolean;
  checks: Array<{ course_id: string; pass: boolean; detail: string }>;
} {
  if (!waikeRoot) {
    return { pass: false, checks: [{ course_id: 'n/a', pass: false, detail: 'no waike root' }] };
  }
  const w = blob(waikeRoot, 'WIRELESS_6G');
  const wireless = {
    course_id: 'WIRELESS_6G',
    pass:
      w.includes('5g-advanced') &&
      w.includes('ntn') &&
      (w.includes('ai-ran') || w.includes('airan')) &&
      (w.includes('commercial standardized 6g does not exist') ||
        w.includes('commercial_6g_exists=false') ||
        w.includes('commercial_6g_exists stays false')) &&
      !w.includes('commercial 6g is available today'),
    detail: '5G/5GA/NTN/AI-RAN honesty; no commercial standardized 6G claim',
  };
  const r = blob(waikeRoot, 'ROBOTICS_CONTROL');
  const robotics = {
    course_id: 'ROBOTICS_CONTROL',
    pass: r.includes('pid') && (r.includes('kinematic') || r.includes('fk')) && r.includes('estop'),
    detail: 'PID/kinematics/estop surfaces required',
  };
  const g = blob(waikeRoot, 'GAME_DEV_INTERACTIVE');
  const game = {
    course_id: 'GAME_DEV_INTERACTIVE',
    pass:
      (g.includes('timestep') || g.includes('dt=1/60') || g.includes('game loop')) &&
      g.includes('input') &&
      (g.includes('fsm') || g.includes('state')),
    detail: 'Real loop/input/state — prose concept insufficient',
  };
  const checks = [wireless, robotics, game];
  return { pass: checks.every((c) => c.pass), checks };
}
