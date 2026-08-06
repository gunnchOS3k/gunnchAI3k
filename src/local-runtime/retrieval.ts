import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RetrievedDocument } from './types';

export interface FixtureCorpus {
  rootDir: string;
  documents: Array<{ relPath: string; absPath: string; title: string; body: string }>;
}

export function defaultFixtureRoot(cwd = process.cwd()): string {
  return path.join(cwd, 'fixtures', 'local-runtime');
}

export function loadFixtureCorpus(rootDir = defaultFixtureRoot()): FixtureCorpus {
  const docsDir = path.join(rootDir, 'documents');
  if (!fs.existsSync(docsDir)) {
    throw new Error(`FIXTURE_CORPUS_MISSING: ${docsDir}`);
  }
  const files = fs
    .readdirSync(docsDir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const documents = files.map((name) => {
    const absPath = path.join(docsDir, name);
    const body = fs.readFileSync(absPath, 'utf8');
    const titleMatch = body.match(/^#\s+(.+)$/m);
    return {
      relPath: path.join('documents', name),
      absPath,
      title: titleMatch?.[1]?.trim() ?? name,
      body,
    };
  });
  return { rootDir, documents };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/**
 * Local document retrieval over approved fixture content only.
 * Returns grounded source attribution paths under fixtures/local-runtime/.
 */
export function retrieveLocalDocuments(
  query: string,
  corpus: FixtureCorpus,
  limit = 3,
): RetrievedDocument[] {
  const qTokens = new Set(tokenize(query));
  const scored = corpus.documents.map((doc) => {
    const dTokens = tokenize(doc.body);
    let overlap = 0;
    for (const t of dTokens) {
      if (qTokens.has(t)) overlap += 1;
    }
    // Light boost for capability keywords in title/path
    const hay = `${doc.title} ${doc.relPath}`.toLowerCase();
    for (const t of qTokens) {
      if (hay.includes(t)) overlap += 2;
    }
    const excerpt = doc.body
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('source_id'))
      .slice(0, 4)
      .join(' ')
      .slice(0, 280);
    const sourceId = `fixtures/local-runtime/${doc.relPath}`;
    return {
      sourceId,
      path: sourceId,
      title: doc.title,
      excerpt,
      score: overlap,
    } satisfies RetrievedDocument;
  });

  return scored
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function retrieveByCapabilityHint(
  capability: string,
  corpus: FixtureCorpus,
): RetrievedDocument[] {
  const hints: Record<string, string> = {
    tutoring: 'tutoring binary search study',
    code_assistance: 'code typescript assistance guard',
    device_help: 'device help health check storage',
    accessibility: 'accessibility plain language transform',
    connectivity_diagnosis: 'connectivity diagnosis local-only bearer',
    document_retrieval: 'tutoring document retrieval fixture',
  };
  return retrieveLocalDocuments(hints[capability] ?? capability, corpus, 2);
}
