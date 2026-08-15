/**
 * Freeze REAL_SOLVER_BASELINE_V1 before changing solving behavior.
 * Immutable once written (refuse overwrite unless FORCE_BASELINE_REWRITE=1).
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CHOICE_PARSER_VERSION } from './choice_parser';

export const BASELINE_SCHEMA = 'REAL_SOLVER_BASELINE_V1';
export const BASELINE_FILENAME = 'REAL_SOLVER_BASELINE_V1.json';

function sha256File(p: string): string | null {
  if (!fs.existsSync(p)) return null;
  const h = createHash('sha256');
  h.update(fs.readFileSync(p));
  return h.digest('hex');
}

function hashCorpus(waikeRoot: string): { course_corpus_hash: string; question_count: number } {
  const digital = path.join(waikeRoot, 'curriculum', 'digital_rc');
  const h = createHash('sha256');
  let q = 0;
  if (!fs.existsSync(digital)) return { course_corpus_hash: 'missing', question_count: 0 };
  for (const course of fs.readdirSync(digital).sort()) {
    const quizzes = path.join(digital, course, 'quizzes');
    if (!fs.existsSync(quizzes)) continue;
    for (const f of fs.readdirSync(quizzes).sort()) {
      const fp = path.join(quizzes, f);
      const raw = fs.readFileSync(fp);
      h.update(raw);
      try {
        const data = JSON.parse(raw.toString('utf8')) as { items?: unknown[] };
        q += (data.items || []).length;
      } catch {
        /* ignore */
      }
    }
  }
  return { course_corpus_hash: h.digest('hex'), question_count: q };
}

function llamaVersion(binary: string | null): string | null {
  if (!binary) return null;
  try {
    return execFileSync(binary, ['--version'], { encoding: 'utf8', timeout: 5000 }).trim().slice(0, 200);
  } catch {
    return null;
  }
}

export function freezeRealSolverBaselineV1(opts: {
  cwd: string;
  waikeRoot: string | null;
  solverReport: Record<string, unknown>;
  force?: boolean;
}): Record<string, unknown> {
  const outDir = path.join(opts.cwd, 'artifacts', 'waike-mastery');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, BASELINE_FILENAME);

  if (fs.existsSync(outPath) && !opts.force && process.env.FORCE_BASELINE_REWRITE !== '1') {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8')) as Record<string, unknown>;
    return { ...existing, _note: 'immutable_baseline_already_frozen', path: outPath };
  }

  const model = String(opts.solverReport.model || '');
  const binary = String(opts.solverReport.binary || '');
  const corpus = opts.waikeRoot
    ? hashCorpus(opts.waikeRoot)
    : { course_corpus_hash: 'no_waike', question_count: 0 };

  const quantMatch = /Q\d+[_A-Z0-9]*/i.exec(model);
  const baseline = {
    schema: BASELINE_SCHEMA,
    frozen_utc: new Date().toISOString(),
    immutable: true,
    model_identity: path.basename(model) || null,
    model_path: model || null,
    model_file_hash: model ? sha256File(model) : null,
    quant: quantMatch ? quantMatch[0] : null,
    llama_cpp_version: llamaVersion(binary || null),
    llama_binary: binary || null,
    prompt_format: {
      instruction: 'Reply with a single letter (A/B/C/D) only.',
      context: 'student_lesson_excerpts_max_1200',
      includes_gold_keys: false,
    },
    context: {
      n_ctx_target: 512,
      lesson_chars: 1200,
    },
    temperature: null,
    seed_policy: 'unset_runtime_default',
    course_corpus_hash: corpus.course_corpus_hash,
    question_count_in_corpus: corpus.question_count,
    parser_version: CHOICE_PARSER_VERSION,
    tool_policy: 'no_tools_during_mcq_baseline_solve',
    hardware: {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      total_mem_mb: Math.floor(os.totalmem() / (1024 * 1024)),
      free_mem_mb: Math.floor(os.freemem() / (1024 * 1024)),
      hostname_hash: createHash('sha256').update(os.hostname()).digest('hex').slice(0, 16),
    },
    runtime_settings: {
      solver: opts.solverReport.solver,
      status: opts.solverReport.status,
      sample_per_course: (opts.solverReport.corpus as { sample_per_course?: unknown } | undefined)
        ?.sample_per_course
        ? undefined
        : undefined,
      grading_agent: opts.solverReport.grading_agent,
      used_instructor_keys_during_solve: opts.solverReport.used_instructor_keys_during_solve,
      self_graded: opts.solverReport.self_graded,
      answer_key_matched: opts.solverReport.answer_key_matched,
    },
    scores: {
      score_family_id: 'MASTERY_002_REAL_RUNTIME_12C',
      overall: opts.solverReport.overall_score,
      items_attempted: opts.solverReport.items_attempted,
      items_correct: opts.solverReport.items_correct,
      per_course: opts.solverReport.per_course,
    },
    per_type_score: {
      quiz_stratified_sample: opts.solverReport.overall_score,
    },
    failure_taxonomy: opts.solverReport.failure_taxonomy,
    claim_boundary:
      'Immutable baseline freeze of real-runtime solver before parser/tool/vertical changes. ' +
      'Only MASTERY_002_REAL_RUNTIME_12C counts toward curriculum mastery — not heuristics.',
  };

  fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2) + '\n');
  // Also write a .sha256 sidecar for immutability checks
  const body = fs.readFileSync(outPath);
  fs.writeFileSync(outPath + '.sha256', createHash('sha256').update(body).digest('hex') + '\n');
  return baseline;
}
