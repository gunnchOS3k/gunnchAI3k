/**
 * Canary: plant keys, attempt to feed into mastery solver discovery, prove refusal.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { assertModePermission, createModeSession } from './modes';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';

export const CANARY_TOKEN = 'CANARY_KEY_LEAK_DO_NOT_EXFILTRATE_9f3a';

export class KeyLeakRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyLeakRefusal';
  }
}

/** Mastery discovery must refuse injected instructor key blobs (canary_text). */
export function masteryDiscoveryContext(opts: {
  studentPayload: unknown;
  injectedInstructorBlob?: string;
}): { ok: true; studentPayload: unknown } {
  const blob = opts.injectedInstructorBlob;
  if (blob) {
    if (blob.includes(CANARY_TOKEN) || blob.includes('answer_index') || blob.includes('waike.answer_keys')) {
      throw new KeyLeakRefusal('refused_instructor_keys_in_mastery_discovery');
    }
  }
  const dumped = JSON.stringify(opts.studentPayload);
  if (dumped.includes(CANARY_TOKEN)) {
    throw new KeyLeakRefusal('canary_token_in_student_discovery');
  }
  return { ok: true, studentPayload: opts.studentPayload };
}

export function runKeyLeakCanary(cwd = process.cwd()): {
  pass: boolean;
  canaryTextUsed: boolean;
  feedAttempted: boolean;
  solverDiscoveryRefused: boolean;
  leakedToMasteryMode: boolean;
  permissionBlocked: boolean;
  registryClean: boolean;
  detail: string;
} {
  const mastery = createModeSession('MASTERY_BENCHMARK');
  let permissionBlocked = false;
  try {
    assertModePermission(mastery.mode, 'read_instructor_keys');
  } catch {
    permissionBlocked = true;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'waike-canary-'));
  const keyFile = path.join(tmp, 'answer_keys.json');
  fs.writeFileSync(
    keyFile,
    JSON.stringify({
      schema: 'waike.answer_keys.v1',
      quizzes: { 'CANARY-q01': [{ id: 'c1', answer_index: 0, explanation: CANARY_TOKEN }] },
    }),
  );
  const canaryText = fs.readFileSync(keyFile, 'utf8');
  const canaryTextUsed = canaryText.includes(CANARY_TOKEN) && canaryText.includes('answer_index');

  const waike = resolveWaikeRoot(cwd);
  const discovered = waike
    ? discoverCoursesFromContract(waike)
    : { course_count: 0, courses: [], hardcoded_course_names: false as const };
  const studentPayload = { mode: mastery.mode, discovered };

  const feedAttempted = true;
  let solverDiscoveryRefused = false;
  try {
    masteryDiscoveryContext({
      studentPayload,
      injectedInstructorBlob: canaryText,
    });
  } catch (err) {
    if (err instanceof KeyLeakRefusal) {
      solverDiscoveryRefused = true;
    } else {
      throw err;
    }
  }

  const clean = masteryDiscoveryContext({ studentPayload });
  const leakedToMasteryMode = JSON.stringify(clean).includes(CANARY_TOKEN);

  let registryClean = true;
  if (waike) {
    const regPath = path.join(waike, 'artifacts', 'mastery', 'ASSESSABLE_ITEM_REGISTRY.json');
    if (fs.existsSync(regPath)) {
      const blob = fs.readFileSync(regPath, 'utf8');
      const parsed = JSON.parse(blob) as {
        key_fields_present_in_registry?: string[];
        items?: Array<Record<string, unknown>>;
      };
      const present = parsed.key_fields_present_in_registry || [];
      const itemLeak = (parsed.items || []).some((it) =>
        Object.keys(it).some((k) =>
          ['answer_index', 'answer_keys', 'explanation', 'correct'].includes(k),
        ),
      );
      registryClean = !blob.includes(CANARY_TOKEN) && present.length === 0 && !itemLeak;
    }
  }

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  const pass =
    permissionBlocked &&
    canaryTextUsed &&
    feedAttempted &&
    solverDiscoveryRefused &&
    !leakedToMasteryMode &&
    registryClean;

  return {
    pass,
    canaryTextUsed,
    feedAttempted,
    solverDiscoveryRefused,
    leakedToMasteryMode,
    permissionBlocked,
    registryClean,
    detail: pass ? 'no-leak-refused-feed' : 'leak-or-permission-or-unused-canary',
  };
}
