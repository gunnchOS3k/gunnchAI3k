/**
 * Real gunnchAI runtime solver for AI-WAIKE-MASTERY-002.
 * Uses llama.cpp when available; never answer-key matches; never reads instructor keys.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LlamaCppBackend } from '../system-layer/local_inference/backends/llamacpp';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';
import { gradeIsolated } from './grader_bridge';
import { classifyMiss, type FailureCode } from './failure_taxonomy';

export type SolverStatus =
  | 'OK'
  | 'BLOCKED_RUNTIME_MODEL'
  | 'BLOCKED_RESOURCE'
  | 'PARTIAL';

export interface SolverItem {
  course_id: string;
  item_id: string;
  assessment_kind: string;
  assessment_id: string;
  local_id: string;
  stem: string;
  choices: string[];
}

function loadStudentMcqSample(
  waikeRoot: string,
  perCourse: number,
): SolverItem[] {
  const digital = path.join(waikeRoot, 'curriculum', 'digital_rc');
  const out: SolverItem[] = [];
  if (!fs.existsSync(digital)) return out;
  for (const course of fs.readdirSync(digital).sort()) {
    const quizzes = path.join(digital, course, 'quizzes');
    if (!fs.existsSync(quizzes)) continue;
    let taken = 0;
    for (const qf of fs.readdirSync(quizzes).sort().filter((f) => /^q\d+\.json$/.test(f))) {
      if (taken >= perCourse) break;
      const data = JSON.parse(fs.readFileSync(path.join(quizzes, qf), 'utf8')) as {
        quiz_id?: string;
        items?: Array<{ id: string; kind?: string; stem?: string; choices?: string[] }>;
      };
      for (const it of data.items || []) {
        if (taken >= perCourse) break;
        if (!it.choices || it.choices.length < 2) continue;
        // Refuse any key-shaped fields if present
        if ('answer_index' in it || 'explanation' in it) {
          throw new Error(`student_quiz_leaked_keys:${course}/${qf}`);
        }
        out.push({
          course_id: course,
          item_id: `${course}:${it.id}`,
          assessment_kind: 'quiz',
          assessment_id: data.quiz_id || qf.replace(/\.json$/, ''),
          local_id: it.id,
          stem: it.stem || '',
          choices: it.choices,
        });
        taken += 1;
      }
    }
  }
  return out;
}

function lessonContext(waikeRoot: string, courseId: string, maxChars = 1200): string {
  const weeks = path.join(waikeRoot, 'curriculum', 'digital_rc', courseId, 'weeks');
  if (!fs.existsSync(weeks)) return '';
  const parts: string[] = [];
  for (const w of fs.readdirSync(weeks).sort().slice(0, 3)) {
    const lesson = path.join(weeks, w, 'lesson.md');
    if (fs.existsSync(lesson)) {
      parts.push(fs.readFileSync(lesson, 'utf8').slice(0, 400));
    }
  }
  return parts.join('\n').slice(0, maxChars);
}

function parseChoiceIndex(text: string, n: number): number | null {
  const m = /\b([A-D]|[0-3])\b/i.exec(text.trim());
  if (!m) return null;
  const raw = m[1].toUpperCase();
  if (raw >= 'A' && raw <= 'D') {
    const i = raw.charCodeAt(0) - 65;
    return i < n ? i : null;
  }
  const i = Number(raw);
  return Number.isFinite(i) && i >= 0 && i < n ? i : null;
}

export async function runGunnchaiRuntimeSolver(opts?: {
  cwd?: string;
  perCourse?: number;
  skipInference?: boolean;
}): Promise<Record<string, unknown>> {
  const cwd = opts?.cwd || process.cwd();
  const perCourse = opts?.perCourse ?? 2;
  const waikeRoot = resolveWaikeRoot(cwd);
  const discovered = waikeRoot
    ? discoverCoursesFromContract(waikeRoot)
    : { course_count: 0, courses: [] as { course_id: string }[], hardcoded_course_names: false as const };

  if (!waikeRoot) {
    return {
      schema: 'gunnchai.waike_runtime_solver.v1',
      status: 'BLOCKED_RUNTIME_MODEL' as SolverStatus,
      detail: 'WAIKE_REPO_ROOT not found',
      overall_score: null,
      used_instructor_keys_during_solve: false,
      self_graded: false,
      answer_key_matched: false,
      corpus: discovered,
    };
  }

  const llama = new LlamaCppBackend(cwd);
  const probe = llama.probe();

  if (process.env.GUNNCHAI_SKIP_PRO_DOWNLOAD === '1' && !probe.ggufPath) {
    return {
      schema: 'gunnchai.waike_runtime_solver.v1',
      status: 'BLOCKED_RESOURCE' as SolverStatus,
      detail: 'Product-Use/resource skip: no large model download; GGUF absent',
      probe,
      overall_score: null,
      used_instructor_keys_during_solve: false,
      self_graded: false,
      answer_key_matched: false,
      corpus: discovered,
    };
  }

  if (!probe.canRunRealInference || !probe.memoryBudgetOk) {
    const status: SolverStatus = !probe.memoryBudgetOk
      ? 'BLOCKED_RESOURCE'
      : 'BLOCKED_RUNTIME_MODEL';
    return {
      schema: 'gunnchai.waike_runtime_solver.v1',
      status,
      detail: probe.notes?.join('; ') || status,
      probe: {
        canRunRealInference: probe.canRunRealInference,
        memoryBudgetOk: probe.memoryBudgetOk,
        freeRamMb: probe.freeRamMb,
        requiredRamMb: probe.requiredRamMb,
        ggufPath: probe.ggufPath,
      },
      overall_score: null,
      used_instructor_keys_during_solve: false,
      self_graded: false,
      answer_key_matched: false,
      note: 'Do not replace unavailable model with answer-key matching.',
      corpus: discovered,
    };
  }

  if (opts?.skipInference) {
    return {
      schema: 'gunnchai.waike_runtime_solver.v1',
      status: 'BLOCKED_RUNTIME_MODEL' as SolverStatus,
      detail: 'skipInference requested',
      overall_score: null,
      used_instructor_keys_during_solve: false,
      self_graded: false,
      answer_key_matched: false,
      corpus: discovered,
    };
  }

  const items = loadStudentMcqSample(waikeRoot, perCourse);
  const submissions: Record<string, Record<string, Record<string, number>>> = {};
  const attempts: Array<Record<string, unknown>> = [];
  const misses: Array<{ failure_code: FailureCode; detail?: string }> = [];
  let keyHits = 0;

  for (const item of items) {
    const ctx = lessonContext(waikeRoot, item.course_id);
    if (ctx.includes('answer_index') || ctx.includes('waike.answer_keys')) {
      keyHits += 1;
    }
    const letters = item.choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join('\n');
    const query = [
      'Answer the multiple-choice question using only the student lesson context.',
      'Reply with a single letter (A/B/C/D) only.',
      `Question: ${item.stem}`,
      letters,
    ].join('\n');

    let choice: number | null = null;
    let raw = '';
    let runtimeError: string | null = null;
    try {
      const result = await llama.infer({
        capability: 'waike-mastery-mcq',
        query,
        contextDocs: ctx
          ? [{ id: `${item.course_id}-lesson`, text: ctx }]
          : undefined,
      });
      raw = result.text || '';
      choice = parseChoiceIndex(raw, item.choices.length);
    } catch (err) {
      runtimeError = err instanceof Error ? err.message : String(err);
    }

    attempts.push({
      item_id: item.item_id,
      course_id: item.course_id,
      choice,
      raw: raw.slice(0, 200),
      runtimeError,
      artifact: {
        model: probe.ggufPath,
        binary: probe.binaryOrModule,
      },
    });

    if (choice == null) {
      misses.push(
        classifyMiss({
          stem: item.stem,
          chosen: raw,
          blockedRuntime: Boolean(runtimeError),
        }),
      );
      continue;
    }
    submissions[item.course_id] ??= {};
    const key = `${item.assessment_kind}::${item.assessment_id}`;
    submissions[item.course_id][key] ??= {};
    submissions[item.course_id][key][item.local_id] = choice;
  }

  // Isolated grade after all submissions
  let correct = 0;
  let total = 0;
  const perCourseScores: Record<string, { correct: number; total: number; score: number }> = {};
  for (const [cid, assessments] of Object.entries(submissions)) {
    let cCorrect = 0;
    let cTotal = 0;
    for (const [akey, answers] of Object.entries(assessments)) {
      const [kind, aid] = akey.split('::');
      const graded = gradeIsolated(waikeRoot, {
        courseId: cid,
        assessmentKind: kind as 'quiz' | 'mid' | 'final',
        assessmentId: aid,
        answers,
      });
      if ('blocked' in graded) continue;
      for (const it of graded.items) {
        if (!(it.id in answers)) continue;
        cTotal += 1;
        total += 1;
        if (it.ok) {
          cCorrect += 1;
          correct += 1;
        } else {
          misses.push(
            classifyMiss({
              stem: `${cid}:${it.id}`,
              chosen: String(it.got),
            }),
          );
        }
      }
    }
    perCourseScores[cid] = {
      correct: cCorrect,
      total: cTotal,
      score: cTotal ? cCorrect / cTotal : 0,
    };
  }

  const overall = total ? correct / total : 0;
  const out = {
    schema: 'gunnchai.waike_runtime_solver.v1',
    status: (attempts.length ? 'OK' : 'PARTIAL') as SolverStatus,
    solver: 'gunnchai_llamacpp_v1',
    model: probe.ggufPath,
    binary: probe.binaryOrModule,
    used_instructor_keys_during_solve: keyHits > 0,
    self_graded: false,
    answer_key_matched: false,
    grading_agent: 'isolated_after_submission',
    items_attempted: total,
    items_correct: correct,
    overall_score: overall,
    per_course: perCourseScores,
    attempts_sample: attempts.slice(0, 12),
    failure_taxonomy: {
      miss_count: misses.length,
      samples: misses.slice(0, 20),
    },
    corpus: {
      discoverable_courses: discovered.course_count,
      course_ids: discovered.courses.map((c) => c.course_id),
      hardcoded_course_names: discovered.hardcoded_course_names,
      sample_per_course: perCourseScores,
    },
    probe: {
      canRunRealInference: probe.canRunRealInference,
      memoryBudgetOk: probe.memoryBudgetOk,
      freeRamMb: probe.freeRamMb,
      metricsMode: probe.metricsMode,
    },
    claim_boundary:
      'Stratified real llama.cpp MCQ attempts on student materials only. Not full-universe mastery; not answer-key matching.',
  };

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'GUNNCHAI_RUNTIME_SOLVER.json'), JSON.stringify(out, null, 2) + '\n');
  return out;
}
