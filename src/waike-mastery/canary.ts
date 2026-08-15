/**
 * Canary: mastery mode must not see instructor key material.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { assertModePermission, createModeSession } from './modes';
import { discoverCoursesFromContract, resolveWaikeRoot } from './contract';

export const CANARY_TOKEN = 'CANARY_KEY_LEAK_DO_NOT_EXFILTRATE_9f3a';

export function runKeyLeakCanary(cwd = process.cwd()): {
  pass: boolean;
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

  // Mastery "solver context" is only student discovery — must not include canary file contents
  const waike = resolveWaikeRoot(cwd);
  const discovered = waike ? discoverCoursesFromContract(waike) : { course_count: 0, courses: [], hardcoded_course_names: false as const };
  const solverContext = JSON.stringify({ mode: mastery.mode, discovered });
  const leakedToMasteryMode = solverContext.includes(CANARY_TOKEN);

  // Optional: if contract artifact exists, ensure canary not in it
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

  const pass = permissionBlocked && !leakedToMasteryMode && registryClean;
  return {
    pass,
    leakedToMasteryMode,
    permissionBlocked,
    registryClean,
    detail: pass ? 'no-leak' : 'leak-or-permission-failure',
  };
}
