/**
 * Authorized teaching text is lesson.md only.
 * A fixture, skill tree, or section index is not a lesson.
 * The model completion stays separate from a source excerpt.
 */

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const STOPWORDS = new Set([
  'say',
  'the',
  'and',
  'for',
  'with',
  'what',
  'how',
  'explain',
  'sentence',
  'versus',
  'help',
  'please',
  'about',
  'from',
  'this',
  'that',
  'into',
  'your',
  'you',
  'are',
  'was',
  'can',
  'does',
  'not',
  'one',
  'basic',
  'simple',
  'concept',
  'practical',
  'two',
  'me',
]);

export interface AuthorizedLessonHit {
  id: string;
  sourcePath: string;
  excerpt: string;
}

export interface LearnerAnswer {
  text: string;
  kind: 'source-backed' | 'model-completion' | 'abstain';
  grounded: boolean;
  sources: string[];
}

export interface AssistCitation {
  source: string;
  snippet: string;
  content_hash: string;
}

function wholeWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((term) => term.length > 0),
  );
}

export function contentTerms(query: string): string[] {
  return [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((term) => term.length > 2 && !STOPWORDS.has(term)),
    ),
  ];
}

function lessonFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 8 || found.length >= 800) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= 800) return;
      if (
        entry.name === 'node_modules' ||
        entry.name.startsWith('.') ||
        entry.name.toLowerCase() === 'instructor'
      ) {
        continue;
      }
      const full = path.join(dir, entry.name);
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        try {
          const stat = fs.statSync(full);
          isDir = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          continue;
        }
      }
      if (isDir) walk(full, depth + 1);
      else if (isFile && entry.name === 'lesson.md') found.push(full);
    }
  };
  walk(root, 0);
  return found;
}

function definesTerm(paragraph: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `\\b${escaped}s?\\b(?:\\s+\\w+){0,1}\\s+(is|are|means|holds|stores)\\b|\\b(is|are|means)\\s+(?:a|an|the)\\s+${escaped}s?\\b`,
    'i',
  );
  return pattern.test(paragraph);
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function defaultLessonRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  const roots: string[] = [];
  const configured = env.WAIKE_ROOT;
  if (configured) {
    roots.push(
      path.join(configured, 'curriculum', 'digital_rc'),
      path.join(configured, 'curriculum', 'curriculum', 'digital_rc'),
      path.join(configured, 'digital_rc'),
    );
  }
  return roots.filter((root) => fs.existsSync(root));
}

/**
 * Match a query to one lesson paragraph.
 * Every content term must occur as a whole word in the lesson path or body.
 * The returned paragraph must contain every term that actually appears in the body,
 * so a track-folder name cannot pull an unrelated section.
 */
export function matchAuthorizedLesson(
  query: string,
  roots: string[],
): AuthorizedLessonHit | null {
  const terms = contentTerms(query);
  if (!terms.length) return null;
  let best: { hit: AuthorizedLessonHit; score: number } | null = null;
  for (const root of roots) {
    for (const file of lessonFiles(root)) {
      let raw = '';
      try {
        raw = fs.readFileSync(file, 'utf8').slice(0, 20_000);
      } catch {
        continue;
      }
      const relative = path.relative(root, file).split(path.sep).join('/');
      const pathWords = wholeWords(relative);
      const bodyWords = wholeWords(raw);
      const covered = terms.filter(
        (term) => pathWords.has(term) || bodyWords.has(term),
      );
      if (terms.length === 1) {
        if (covered.length !== 1) continue;
      } else if (covered.length < 2 || covered.length !== terms.length) {
        continue;
      }
      const bodyTerms = terms.filter((term) => bodyWords.has(term));
      if (!bodyTerms.length) continue;
      const requiredInParagraph = bodyTerms.filter((term) => !pathWords.has(term));
      const must = requiredInParagraph.length ? requiredInParagraph : bodyTerms;
      const parts = paragraphs(raw);
      let chosen = '';
      let chosenScore = -1;
      for (let index = 0; index < parts.length; index += 1) {
        const paragraph =
          parts[index]!.startsWith('#') && parts[index + 1]
            ? `${parts[index]}\n\n${parts[index + 1]}`
            : parts[index]!;
        const words = wholeWords(paragraph);
        if (!must.every((term) => words.has(term))) continue;
        if (terms.length === 1 && !definesTerm(paragraph, terms[0]!)) continue;
        const score =
          must.filter((term) => words.has(term)).length * 2 +
          (definesTerm(paragraph, must[0]!) ? 2 : 0) +
          (/\bpractical\b/i.test(query) && /practice|^\s*\d+\./m.test(paragraph)
            ? 5
            : 0);
        if (score > chosenScore) {
          chosen = paragraph;
          chosenScore = score;
        }
      }
      if (!chosen) continue;
      const excerpt = chosen.slice(0, 700);
      const score = chosenScore + covered.length;
      if (!best || score > best.score) {
        best = {
          score,
          hit: {
            id: `waike:${relative}`,
            sourcePath: file,
            excerpt,
          },
        };
      }
    }
  }
  return best?.hit ?? null;
}

function asksForUnsourcedQuantity(query: string): boolean {
  return /\b(boiling|melting|temperature|degrees)\b/i.test(query);
}

export function composeLearnerAnswer(input: {
  query: string;
  modelText: string;
  lesson: AuthorizedLessonHit | null;
}): LearnerAnswer {
  const modelText = input.modelText.trim();
  if (input.lesson) {
    return {
      kind: 'source-backed',
      grounded: true,
      sources: [input.lesson.id],
      text: `Source: ${input.lesson.id}\n\n${input.lesson.excerpt}`,
    };
  }
  if (asksForUnsourcedQuantity(input.query) && /\d/.test(modelText)) {
    return {
      kind: 'abstain',
      grounded: false,
      sources: [],
      text: 'No authorized lesson matches that question, so this assistant will not guess a number.',
    };
  }
  if (!modelText) {
    return {
      kind: 'abstain',
      grounded: false,
      sources: [],
      text: '',
    };
  }
  return {
    kind: 'model-completion',
    grounded: false,
    sources: [],
    text: modelText,
  };
}

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Hub injects unrelated section files when citations is empty.
 * A real lesson citation names that lesson. No match is an explicit
 * unmatched citation, not a Digital Confidence section file.
 */
export function tutoringCitations(
  answer: LearnerAnswer,
): AssistCitation[] {
  if (answer.grounded && answer.sources.length) {
    const snippet = answer.text.slice(0, 400);
    return answer.sources.map((source) => ({
      source,
      snippet,
      content_hash: sha256Text(snippet),
    }));
  }
  const snippet = 'No authorized lesson matched this question.';
  return [
    {
      source: 'local:no-authorized-lesson',
      snippet,
      content_hash: sha256Text(snippet),
    },
  ];
}
