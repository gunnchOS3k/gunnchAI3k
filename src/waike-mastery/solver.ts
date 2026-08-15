/**
 * Real gunnchAI runtime solver for AI-WAIKE-MASTERY-002.
 * Uses llama.cpp when available; never answer-key matches; never reads instructor keys.
 * Choice parsing is final-answer-only (see choice_parser.ts).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LlamaCppBackend } from '../system-layer/local_inference/backends/llamacpp';
import { freezeRealSolverBaselineV1 } from './baseline_v1';
import { CHOICE_PARSER_VERSION, parseFinalChoice } from './choice_parser';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';
import { runToolAssistForStem } from './curriculum_tools';
import { aggregateTaxonomy, classifyMiss, type FailureCode } from './failure_taxonomy';
import { gradeIsolated } from './grader_bridge';
import { buildLeanMcqPrompt, leanMcqInfer, resolveMasteryGguf } from './mcq_infer';

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

type McqItemRaw = { id: string; kind?: string; stem?: string; choices?: string[] };

function assertNoStudentKeys(course: string, rel: string, it: McqItemRaw): void {
  if ('answer_index' in it || 'explanation' in it) {
    throw new Error(`student_assessment_leaked_keys:${course}/${rel}`);
  }
}

function pushMcqItems(
  out: SolverItem[],
  course: string,
  assessmentKind: string,
  assessmentId: string,
  items: McqItemRaw[],
  limit: number | null,
  maxTotal: number | null,
  rel: string,
): number {
  let taken = 0;
  for (const it of items) {
    if (limit != null && taken >= limit) break;
    if (maxTotal != null && out.length >= maxTotal) break;
    if (!it.choices || it.choices.length < 2) continue;
    assertNoStudentKeys(course, rel, it);
    out.push({
      course_id: course,
      item_id: `${course}:${it.id}`,
      assessment_kind: assessmentKind,
      assessment_id: assessmentId,
      local_id: it.id,
      stem: it.stem || '',
      choices: it.choices,
    });
    taken += 1;
  }
  return taken;
}

/**
 * Load student-facing MCQs only (no instructor keys).
 * Default: quiz-only for backward-compatible stratified samples.
 * Stratified held-out: set perCourseQuiz / perCourseMid / perCourseFinal.
 */
function loadStudentMcq(
  waikeRoot: string,
  opts: {
    perCourse?: number | null;
    perCourseQuiz?: number | null;
    perCourseMid?: number | null;
    perCourseFinal?: number | null;
    courseIds?: string[] | null;
    maxTotal?: number | null;
  },
): SolverItem[] {
  const digital = path.join(waikeRoot, 'curriculum', 'digital_rc');
  const out: SolverItem[] = [];
  if (!fs.existsSync(digital)) return out;
  const allow = opts.courseIds ? new Set(opts.courseIds) : null;
  const stratified =
    opts.perCourseQuiz != null || opts.perCourseMid != null || opts.perCourseFinal != null;
  const quizBudget = stratified
    ? opts.perCourseQuiz ?? 0
    : opts.perCourse === undefined
      ? 2
      : opts.perCourse;
  const midBudget = stratified ? opts.perCourseMid ?? 0 : 0;
  const finalBudget = stratified ? opts.perCourseFinal ?? 0 : 0;

  for (const course of fs.readdirSync(digital).sort()) {
    if (allow && !allow.has(course)) continue;
    if (opts.maxTotal != null && out.length >= opts.maxTotal) break;

    if (quizBudget == null || quizBudget > 0) {
      const quizzes = path.join(digital, course, 'quizzes');
      if (fs.existsSync(quizzes)) {
        let taken = 0;
        for (const qf of fs.readdirSync(quizzes).sort().filter((f) => /^q\d+\.json$/.test(f))) {
          if (quizBudget != null && taken >= quizBudget) break;
          if (opts.maxTotal != null && out.length >= opts.maxTotal) break;
          const data = JSON.parse(fs.readFileSync(path.join(quizzes, qf), 'utf8')) as {
            quiz_id?: string;
            items?: McqItemRaw[];
          };
          taken += pushMcqItems(
            out,
            course,
            'quiz',
            data.quiz_id || qf.replace(/\.json$/, ''),
            data.items || [],
            quizBudget == null ? null : quizBudget - taken,
            opts.maxTotal ?? null,
            `quizzes/${qf}`,
          );
        }
      }
    }

    if (midBudget > 0) {
      const midPath = path.join(digital, course, 'assessments', 'mid_course.json');
      if (fs.existsSync(midPath)) {
        const data = JSON.parse(fs.readFileSync(midPath, 'utf8')) as {
          assessment_id?: string;
          items?: McqItemRaw[];
        };
        pushMcqItems(
          out,
          course,
          'mid',
          data.assessment_id || `${course}-mid`,
          data.items || [],
          midBudget,
          opts.maxTotal ?? null,
          'assessments/mid_course.json',
        );
      }
    }

    if (finalBudget > 0) {
      const finPath = path.join(digital, course, 'assessments', 'final_knowledge.json');
      if (fs.existsSync(finPath)) {
        const data = JSON.parse(fs.readFileSync(finPath, 'utf8')) as {
          assessment_id?: string;
          items?: McqItemRaw[];
        };
        pushMcqItems(
          out,
          course,
          'final',
          data.assessment_id || `${course}-final`,
          data.items || [],
          finalBudget,
          opts.maxTotal ?? null,
          'assessments/final_knowledge.json',
        );
      }
    }
  }
  return out;
}

function lessonContext(waikeRoot: string, courseId: string, maxChars = 600): string {
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

export async function runGunnchaiRuntimeSolver(opts?: {
  cwd?: string;
  perCourse?: number | null;
  perCourseQuiz?: number | null;
  perCourseMid?: number | null;
  perCourseFinal?: number | null;
  courseIds?: string[] | null;
  maxTotal?: number | null;
  skipInference?: boolean;
  freezeBaseline?: boolean;
  label?: string;
}): Promise<Record<string, unknown>> {
  const cwd = opts?.cwd || process.cwd();
  const perCourse = opts?.perCourse === undefined ? 2 : opts.perCourse;
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

  const items = loadStudentMcq(waikeRoot, {
    perCourse,
    perCourseQuiz: opts?.perCourseQuiz ?? null,
    perCourseMid: opts?.perCourseMid ?? null,
    perCourseFinal: opts?.perCourseFinal ?? null,
    courseIds: opts?.courseIds ?? null,
    maxTotal: opts?.maxTotal ?? null,
  });
  const submissions: Record<string, Record<string, Record<string, number>>> = {};
  const attempts: Array<Record<string, unknown>> = [];
  const misses: Array<{
    failure_code: FailureCode;
    first_divergence: string;
    stem_excerpt: string;
    course_id?: string;
    assessment_kind?: string;
  }> = [];
  let keyHits = 0;
  let parserFailures = 0;
  const stemByItem = new Map<string, string>();
  for (const it of items) stemByItem.set(it.item_id, it.stem);

  const masteryGguf = resolveMasteryGguf(cwd);
  let toolAssists = 0;
  let toolAssistOk = 0;

  for (const item of items) {
    const ctx = lessonContext(waikeRoot, item.course_id);
    if (ctx.includes('answer_index') || ctx.includes('waike.answer_keys')) {
      keyHits += 1;
    }

    const toolAssist = runToolAssistForStem(item.stem);
    if (toolAssist.required) {
      toolAssists += 1;
      if (toolAssist.used && toolAssist.record?.grader_ok) toolAssistOk += 1;
    }

    const prompt = buildLeanMcqPrompt({
      stem: item.stem,
      choices: item.choices,
      lessonExcerpt: ctx || undefined,
      toolNote: toolAssist.note || undefined,
    });

    let choice: number | null = null;
    let raw = '';
    let runtimeError: string | null = null;
    let parseMeta: ReturnType<typeof parseFinalChoice> | null = null;
    let latencyMs: number | null = null;
    try {
      // Prefer lean MCQ path (no structured overlay pollution). Fallback to LlamaCppBackend.
      const lean = leanMcqInfer({
        cwd,
        prompt,
        ggufPath: masteryGguf,
      });
      latencyMs = lean.latency_ms;
      if (lean.ok && lean.text) {
        raw = lean.text;
      } else {
        const result = await llama.infer({
          capability: 'waike-mastery-mcq',
          query: prompt,
          contextDocs: ctx
            ? [{ id: `${item.course_id}-lesson`, text: ctx }]
            : undefined,
        });
        raw = result.text || '';
        if (!lean.ok) runtimeError = lean.detail;
      }
      parseMeta = parseFinalChoice(raw, item.choices.length);
      choice = parseMeta.index;
    } catch (err) {
      runtimeError = err instanceof Error ? err.message : String(err);
    }

    attempts.push({
      item_id: item.item_id,
      course_id: item.course_id,
      choice,
      parse: parseMeta,
      raw: raw.slice(0, 400),
      runtimeError,
      latency_ms: latencyMs,
      tool_assist: toolAssist.required
        ? {
            used: toolAssist.used,
            tool_id: toolAssist.tool_id,
            failure: toolAssist.failure,
          }
        : null,
      artifact: {
        model: masteryGguf || probe.ggufPath,
        binary: probe.binaryOrModule,
        parser_version: CHOICE_PARSER_VERSION,
        infer_path: 'lean_mcq_v1',
      },
    });

    if (choice == null) {
      parserFailures += 1;
      misses.push({
        ...classifyMiss({
          stem: item.stem,
          chosen: raw,
          blockedRuntime: Boolean(runtimeError),
          parserFailed: !runtimeError,
          toolRequiredNotUsed: toolAssist.failure === 'TOOL_REQUIRED_NOT_USED',
          toolFailed: toolAssist.failure === 'TOOL_EXECUTION_FAILURE',
          calcMismatch: toolAssist.failure === 'CALCULATION_FAILURE',
        }),
        course_id: item.course_id,
        assessment_kind: item.assessment_kind,
      });
      continue;
    }
    submissions[item.course_id] ??= {};
    const key = `${item.assessment_kind}::${item.assessment_id}`;
    submissions[item.course_id][key] ??= {};
    submissions[item.course_id][key][item.local_id] = choice;
  }

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
          misses.push({
            ...classifyMiss({
              stem: stemByItem.get(`${cid}:${it.id}`) || `${cid}:${it.id}`,
              chosen: String(it.got),
            }),
            course_id: cid,
            assessment_kind: kind,
          });
        }
      }
    }
    perCourseScores[cid] = {
      correct: cCorrect,
      total: cTotal,
      score: cTotal ? cCorrect / cTotal : 0,
    };
  }

  // Honesty: parser failures count as incorrect in the real-runtime denominator.
  const attemptedUniverse = items.length;
  const gradedTotal = total;
  const honestTotal = gradedTotal + parserFailures;
  const overall = honestTotal ? correct / honestTotal : 0;
  const parseableOnlyScore = gradedTotal ? correct / gradedTotal : 0;
  const census = aggregateTaxonomy(misses);

  const perType: Record<string, { correct: number; total: number; score: number }> = {};
  for (const [cid, assessments] of Object.entries(submissions)) {
    for (const [akey, answers] of Object.entries(assessments)) {
      const [kind, aid] = akey.split('::');
      const graded = gradeIsolated(waikeRoot, {
        courseId: cid,
        assessmentKind: kind as 'quiz' | 'mid' | 'final',
        assessmentId: aid,
        answers,
      });
      if ('blocked' in graded) continue;
      for (const git of graded.items) {
        if (!(git.id in answers)) continue;
        perType[kind] ??= { correct: 0, total: 0, score: 0 };
        perType[kind].total += 1;
        if (git.ok) perType[kind].correct += 1;
      }
    }
  }
  for (const row of Object.values(perType)) {
    row.score = row.total ? row.correct / row.total : 0;
  }

  const denom = honestTotal || 1;
  const counts = (census.counts || {}) as Record<string, number>;
  const failRates = {
    parser: parserFailures / denom,
    reasoning: (counts.REASONING_FAILURE || 0) / denom,
    knowledge: (counts.MODEL_KNOWLEDGE_GAP || 0) / denom,
    tool_required: (counts.TOOL_REQUIRED_NOT_USED || 0) / denom,
    instruction: (counts.INSTRUCTION_INTERPRETATION_FAILURE || 0) / denom,
    calculation: (counts.CALCULATION_FAILURE || 0) / denom,
    concept_confusion: (counts.CONCEPT_CONFUSION || 0) / denom,
    prerequisite: (counts.PREREQUISITE_GAP || 0) / denom,
  };

  const out: Record<string, unknown> = {
    schema: 'gunnchai.waike_runtime_solver.v1',
    status: (attempts.length ? 'OK' : 'PARTIAL') as SolverStatus,
    solver: 'gunnchai_llamacpp_v1',
    score_family_id: 'MASTERY_002_REAL_RUNTIME_12C',
    model: probe.ggufPath,
    binary: probe.binaryOrModule,
    parser_version: CHOICE_PARSER_VERSION,
    used_instructor_keys_during_solve: keyHits > 0,
    self_graded: false,
    answer_key_matched: false,
    grading_agent: 'isolated_after_submission',
    items_loaded: attemptedUniverse,
    items_attempted: honestTotal,
    items_graded: gradedTotal,
    items_correct: correct,
    parser_failures: parserFailures,
    overall_score: overall,
    parseable_only_score: parseableOnlyScore,
    per_course: perCourseScores,
    per_assessment_type: perType,
    failure_rates: failRates,
    attempts_sample: attempts.slice(0, 12),
    failure_taxonomy: {
      miss_count: misses.length,
      samples: misses.slice(0, 20),
      census,
    },
    corpus: {
      discoverable_courses: discovered.course_count,
      course_ids: discovered.courses.map((c) => c.course_id),
      hardcoded_course_names: discovered.hardcoded_course_names,
      sample_per_course: perCourseScores,
      label: opts?.label || 'stratified_sample',
    },
    probe: {
      canRunRealInference: probe.canRunRealInference,
      memoryBudgetOk: probe.memoryBudgetOk,
      freeRamMb: probe.freeRamMb,
      metricsMode: probe.metricsMode,
    },
    tool_assist: {
      required_items: toolAssists,
      assisted_ok: toolAssistOk,
      note: 'Curriculum tool assist on calc-like stems; computation only — not answer-key feed.',
    },
    infer_path: 'lean_mcq_v1',
    claim_boundary:
      'Real llama.cpp MCQ attempts on student materials only. Isolated grade after submission. ' +
      'Only MASTERY_002_REAL_RUNTIME_12C counts toward curriculum mastery. Lean MCQ path avoids overlay pollution.',
  };

  if (opts?.freezeBaseline) {
    out.baseline_v1 = freezeRealSolverBaselineV1({
      cwd,
      waikeRoot,
      solverReport: out,
    });
  }

  const outDir = path.join(cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'GUNNCHAI_RUNTIME_SOLVER.json'), JSON.stringify(out, null, 2) + '\n');
  if (opts?.label) {
    const safe = opts.label.replace(/[^a-zA-Z0-9_-]+/g, '_');
    fs.writeFileSync(
      path.join(outDir, `GUNNCHAI_RUNTIME_SOLVER_${safe}.json`),
      JSON.stringify(out, null, 2) + '\n',
    );
  }
  return out;
}
