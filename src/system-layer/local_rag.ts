/**
 * Continuance V local RAG — thin re-export over LocalRagEngine.
 * Keeps Continuance IV import paths stable.
 */

export {
  LocalRagEngine,
  loadLocalRagCorpus,
  retrieveForQuery,
  type RagChunk,
  type RagDocumentMeta,
  type RagSearchHit,
  type RagAttribution,
  type RagIndexStats,
} from './product_service/rag_engine';

import type { RagDocumentMeta } from './product_service/rag_engine';
import { LocalRagEngine } from './product_service/rag_engine';

/** @deprecated Prefer RagDocumentMeta / LocalRagEngine */
export interface RagDocument {
  id: string;
  text: string;
  sourcePath: string;
}

/** @deprecated Prefer RagSearchHit */
export interface RagHit extends RagDocument {
  score: number;
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
      if (/binary|search|sort|complexity/i.test(query) && /tutor|binary|search/i.test(hay)) {
        score += 1;
      }
      return { ...d, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function ensureDefaultRagIndex(cwd = process.cwd()): RagDocumentMeta[] {
  const engine = new LocalRagEngine(cwd);
  if (engine.stats().documents === 0) engine.rebuild();
  return engine.listDocuments();
}
