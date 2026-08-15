/**
 * Isolated grading bridge — loads WAIKE grader after submission only.
 * Solver must never import this module's grade path into solve context.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface GradeRequest {
  courseId: string;
  assessmentKind: 'quiz' | 'mid' | 'final';
  assessmentId: string;
  answers: Record<string, number>;
}

export interface GradeResult {
  course_id: string;
  assessment_id: string;
  assessment_kind: string;
  correct: number;
  total: number;
  score: number;
  self_graded: false;
  grader: string;
  items: Array<{ id: string; ok: boolean; expected?: number; got?: number | null }>;
}

export function gradeIsolated(
  waikeRoot: string,
  req: GradeRequest,
): GradeResult | { error: string; blocked: true } {
  const script = `
import json, sys
sys.path.insert(0, ${JSON.stringify(path.join(waikeRoot, 'src'))})
from waike_mastery.grading import grade_mcq_submission
req = json.loads(sys.stdin.read())
out = grade_mcq_submission(
  req["courseId"], req["assessmentKind"], req["assessmentId"], req["answers"],
  root=__import__("pathlib").Path(${JSON.stringify(waikeRoot)})
)
print(json.dumps(out))
`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'waike-grade-'));
  const py = path.join(tmp, 'grade_once.py');
  fs.writeFileSync(py, script);
  try {
    const r = spawnSync('python3', [py], {
      input: JSON.stringify(req),
      encoding: 'utf8',
      cwd: waikeRoot,
      timeout: 30_000,
    });
    if (r.status !== 0) {
      return { error: r.stderr || r.stdout || 'grade_failed', blocked: true };
    }
    return JSON.parse(r.stdout) as GradeResult;
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
