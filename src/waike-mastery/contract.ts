/**
 * Resolve WAIKE repo root for learning-contract discovery (sibling or env).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export function resolveWaikeRoot(cwd = process.cwd()): string | null {
  const env = process.env.WAIKE_REPO_ROOT;
  if (env && fs.existsSync(path.join(env, 'curriculum', 'digital_rc'))) {
    return path.resolve(env);
  }
  const sibling = path.resolve(cwd, '..', 'waike-research-ops');
  if (fs.existsSync(path.join(sibling, 'curriculum', 'digital_rc'))) {
    return sibling;
  }
  const explicit = path.resolve(
    cwd,
    '..',
    'gunnchos-7gc-research-product-spine',
    'repos',
    'waike-research-ops',
  );
  if (fs.existsSync(path.join(explicit, 'curriculum', 'digital_rc'))) {
    return explicit;
  }
  return null;
}

export interface DiscoveredCourse {
  course_id: string;
  title: string;
  path: string;
  weeks: number;
  lab_ids: string[];
}

export function discoverCoursesFromContract(waikeRoot: string): {
  course_count: number;
  hardcoded_course_names: false;
  courses: DiscoveredCourse[];
} {
  const digital = path.join(waikeRoot, 'curriculum', 'digital_rc');
  const courses: DiscoveredCourse[] = [];
  if (!fs.existsSync(digital)) {
    return { course_count: 0, hardcoded_course_names: false, courses };
  }
  for (const name of fs.readdirSync(digital).sort()) {
    const courseJson = path.join(digital, name, 'course.json');
    if (!fs.existsSync(courseJson)) continue;
    const data = JSON.parse(fs.readFileSync(courseJson, 'utf8')) as {
      course_id?: string;
      title?: string;
      weeks?: unknown[];
    };
    const labsDir = path.join(digital, name, 'labs');
    const lab_ids = fs.existsSync(labsDir)
      ? fs
          .readdirSync(labsDir)
          .filter((d) => fs.existsSync(path.join(labsDir, d, 'README.md')))
          .sort()
      : [];
    courses.push({
      course_id: data.course_id || name,
      title: data.title || name,
      path: path.join('curriculum', 'digital_rc', name),
      weeks: Array.isArray(data.weeks) ? data.weeks.length : 0,
      lab_ids,
    });
  }
  return { course_count: courses.length, hardcoded_course_names: false, courses };
}
