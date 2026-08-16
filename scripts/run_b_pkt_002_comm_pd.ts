/**
 * STREAM-B-PKT-002 — COMM_PD consumption + unblended mastery delta + Local Pro gate.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runCommPdConsumption, COMM_PD_COURSE_ID } from '../src/waike-mastery/comm_pd_consumption';
import { runGunnchaiRuntimeSolver } from '../src/waike-mastery/solver';
import { SCORE_FAMILY } from '../src/waike-mastery/tokens';

const cwd = process.cwd();
const waike = process.env.WAIKE_REPO_ROOT || path.resolve(cwd, '..', 'waike-research-ops');
process.env.WAIKE_REPO_ROOT = waike;

async function main() {
  const consumption = runCommPdConsumption(cwd);

  // COMM_PD-only real runtime (Nano 135M OK for course-specific delta; not Local Pro)
  const runtime = await runGunnchaiRuntimeSolver({
    cwd,
    courseIds: [COMM_PD_COURSE_ID],
    perCourse: 10, // 10 quiz items across weeks if available
    maxTotal: 24,
    label: 'comm_pd_ethics_runtime_b_pkt_002',
    scoreFamilyId: SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME,
    writePrimarySolverArtifact: false, // never overwrite 12C tip artifact
  });

  const score =
    typeof runtime.overall_score === 'number' ? (runtime.overall_score as number) : null;
  // Harden labeling if an older solver path omitted the override.
  (runtime as { score_family_id?: string }).score_family_id =
    SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME;

  const familiesPath = path.join(cwd, 'artifacts', 'waike-mastery', 'SCORE_FAMILIES.json');
  const families = JSON.parse(fs.readFileSync(familiesPath, 'utf8')) as Record<string, unknown>;
  const historical = families['MASTERY_002_REAL_RUNTIME_12C'] as Record<string, unknown>;
  if (Number(historical.score) !== 0.30833333333333335) {
    throw new Error(`HISTORICAL_12C_MUTATED: ${historical.score}`);
  }

  families[SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME] = {
    id: SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME,
    score,
    role: 'course_specific_runtime_unblended',
    solver: 'gunnchai_llamacpp_v1',
    course_id: COMM_PD_COURSE_ID,
    counts_toward_curriculum_mastery: false,
    items_attempted: runtime.items_attempted ?? null,
    items_correct: runtime.items_correct ?? null,
    parser_failures: runtime.parser_failures ?? null,
    sample: 'COMM_PD_ETHICS_only_b_pkt_002',
    blended_into_historical_12c: false,
    historical_12c_preserved: 0.30833333333333335,
    note: 'NEW versioned COMM_PD-only family. Do not average into MASTERY_002_REAL_RUNTIME_12C.',
  };
  families.no_blended_average = true;
  families.note =
    'Heuristics must never replace or average into MASTERY_002_REAL_RUNTIME_12C. COMM_PD family is additive and unblended.';
  fs.writeFileSync(familiesPath, JSON.stringify(families, null, 2) + '\n');

  // Local Pro — single RAM check, no retry loop
  const freeMem = os.freemem();
  const safe = freeMem >= 2 * 1024 * 1024 * 1024;
  const localPro = {
    schema: 'gunnchai.local_pro_status.v1',
    packet: 'STREAM-B-PKT-002',
    status: 'LOCAL_PRO_RESOURCE_PENDING' as const,
    candidate: 'Qwen/Qwen2.5-1.5B-Instruct',
    license: 'Apache-2.0',
    pinned_sha256: '1adf0b11065d8ad2e8123ea110d1ec956dab4ab038eab665614adba04b6c3370',
    expected_bytes: 986048768,
    freeMemBytes: freeMem,
    freeDiskBytes: null as number | null,
    resourceSafe: false,
    host_observed_inference: false,
    controlled_run_attempted: false,
    notes: safe
      ? 'Freemem gate marginal; STREAM-B-PKT-002 keeps LOCAL_PRO_RESOURCE_PENDING without auto ~1GB download (no retry loop).'
      : 'LOCAL_PRO_RESOURCE_PENDING: freemem below 2 GiB gate; no ~1GB Pro download attempted; no retry loop.',
    preserve_360M_negative: {
      source: 'artifacts/local_pro/LOCAL_PRO_AB_STREAM_B_PKT_001.json',
      MODEL_A_135M_overall: 0.30833333333333335,
      MODEL_B_360M_overall: 0.2916666666666667,
      delta_overall: -0.016666666666666663,
      adoption_recommendation: 'DO_NOT_ADOPT_AS_MASTERY_SOLVER_DEFAULT',
      preserved: true,
    },
    HUMAN_E6: false,
    FRONTIER_PARITY: false,
  };
  fs.writeFileSync(path.join(cwd, 'benchmarks', 'LOCAL_PRO_STATUS.json'), JSON.stringify(localPro, null, 2) + '\n');

  const streamDir = path.join(cwd, 'artifacts', 'stream_b');
  fs.mkdirSync(streamDir, { recursive: true });
  fs.writeFileSync(
    path.join(streamDir, 'COMM_PD_ETHICS_MASTERY_DELTA.json'),
    JSON.stringify(
      {
        schema: 'gunnchai.comm_pd_mastery_delta.v1',
        packet: 'STREAM-B-PKT-002',
        score_family_id: SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME,
        score,
        runtime,
        historical_families_preserved: {
          MASTERY_001_HEURISTIC_9C: 0.6442307692307693,
          MASTERY_002_HEURISTIC_12C: 0.6298076923076923,
          MASTERY_002_REAL_RUNTIME_12C: 0.30833333333333335,
        },
        blended: false,
        claim_boundary:
          'Course-specific COMM_PD eval only. Historical 120-item 0.30833 untouched. Not DIGITAL_MASTERY_PASS.',
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(path.join(streamDir, 'LOCAL_PRO_STREAM_B_PKT_002.json'), JSON.stringify(localPro, null, 2) + '\n');

  console.log(
    JSON.stringify(
      {
        consumption_ok: Boolean((consumption as { discovery?: { found?: boolean } }).discovery?.found),
        score_family: SCORE_FAMILY.MASTERY_002_COMM_PD_ETHICS_RUNTIME,
        score,
        historical_12c: 0.30833333333333335,
        local_pro: localPro.status,
        key_leak_pass: (consumption as { key_leak_guard?: { WAIKE_AI_NO_KEY_LEAK_PASS?: boolean } })
          .key_leak_guard?.WAIKE_AI_NO_KEY_LEAK_PASS,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
