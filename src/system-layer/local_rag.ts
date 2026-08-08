/**
 * Continuance IV local RAG — fixture + system-layer corpus retrieval.
 * Deterministic ranking; optional LLM synthesis happens in the runtime adapter.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface RagDocument {
  id: string;
  text: string;
  sourcePath: string;
}

export interface RagHit extends RagDocument {
  score: number;
}

export function loadLocalRagCorpus(cwd = process.cwd()): RagDocument[] {
  const docs: RagDocument[] = [];
  const roots = [
    path.join(cwd, 'fixtures', 'system-layer', 'rag-corpus'),
    path.join(cwd, 'fixtures', 'local-runtime'),
  ];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    walkTextFiles(root, (abs, rel) => {
      const text = fs.readFileSync(abs, 'utf8');
      if (!text.trim()) return;
      docs.push({
        id: rel.replace(/\\/g, '/'),
        text: text.slice(0, 4000),
        sourcePath: abs,
      });
    });
  }
  return docs;
}

function walkTextFiles(
  root: string,
  visit: (abs: string, rel: string) => void,
  base = root,
): void {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkTextFiles(abs, visit, base);
      continue;
    }
    if (!/\.(md|txt|json|jsonl)$/i.test(entry.name)) continue;
    visit(abs, path.relative(base, abs));
  }
}

export function rankLocalDocuments(
  query: string,
  docs: RagDocument[],
  limit = 5,
): RagHit[] {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  return docs
    .map((d) => {
      const hay = `${d.id} ${d.text}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (hay.includes(t)) score += 1;
      }
      // Prefer tutoring/scientific notes slightly when query mentions algorithms
      if (/binary|search|sort|complexity/i.test(query) && /tutor|binary|search/i.test(hay)) {
        score += 1;
      }
      return { ...d, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function retrieveForQuery(
  query: string,
  cwd = process.cwd(),
  limit = 5,
): RagHit[] {
  return rankLocalDocuments(query, loadLocalRagCorpus(cwd), limit);
}
