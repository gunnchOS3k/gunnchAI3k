/**
 * Continuance V — real local RAG engine.
 * ingest → chunk → index → search → attribution → delete → rebuild
 * Integrates device docs / WAIKE / Archive fixture subsets.
 */

import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface RagChunk {
  chunkId: string;
  docId: string;
  sourcePath: string;
  corpus: string;
  text: string;
  offset: number;
  tokensApprox: number;
  terms: string[];
  sha256: string;
}

export interface RagDocumentMeta {
  docId: string;
  sourcePath: string;
  corpus: 'device' | 'waike' | 'archive' | 'system' | 'local-runtime' | 'custom';
  title: string;
  bytes: number;
  chunkCount: number;
  ingestedAt: string;
  sha256: string;
}

export interface RagIndexStats {
  documents: number;
  chunks: number;
  corpora: Record<string, number>;
  rebuiltAt: string | null;
  indexPath: string;
}

export interface RagSearchHit {
  chunkId: string;
  docId: string;
  sourcePath: string;
  corpus: string;
  score: number;
  excerpt: string;
  attribution: string;
}

export interface RagAttribution {
  query: string;
  hits: RagSearchHit[];
  attributionLines: string[];
  grounded: boolean;
}

interface PersistedIndex {
  schemaVersion: '1.0.0';
  documents: RagDocumentMeta[];
  chunks: RagChunk[];
  rebuiltAt: string | null;
}

const TEXT_EXT = /\.(md|txt|json|jsonl|yaml|yml)$/i;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
}

function chunkText(text: string, chunkSize = 700, overlap = 80): Array<{ text: string; offset: number }> {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  const out: Array<{ text: string; offset: number }> = [];
  let i = 0;
  while (i < cleaned.length) {
    const slice = cleaned.slice(i, i + chunkSize);
    out.push({ text: slice, offset: i });
    if (i + chunkSize >= cleaned.length) break;
    i += chunkSize - overlap;
  }
  return out;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function walkFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const files: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (TEXT_EXT.test(entry.name)) files.push(abs);
    }
  }
  return files.sort();
}

export class LocalRagEngine {
  private documents = new Map<string, RagDocumentMeta>();
  private chunks = new Map<string, RagChunk>();
  private rebuiltAt: string | null = null;
  readonly indexPath: string;
  readonly cwd: string;

  constructor(cwd = process.cwd(), storeDir?: string) {
    this.cwd = cwd;
    const dir = storeDir ?? path.join(cwd, 'var', 'gunnchai', 'rag');
    fs.mkdirSync(dir, { recursive: true });
    this.indexPath = path.join(dir, 'index.json');
    this.load();
  }

  stats(): RagIndexStats {
    const corpora: Record<string, number> = {};
    for (const d of this.documents.values()) {
      corpora[d.corpus] = (corpora[d.corpus] ?? 0) + 1;
    }
    return {
      documents: this.documents.size,
      chunks: this.chunks.size,
      corpora,
      rebuiltAt: this.rebuiltAt,
      indexPath: this.indexPath,
    };
  }

  listDocuments(): RagDocumentMeta[] {
    return [...this.documents.values()].sort((a, b) => a.docId.localeCompare(b.docId));
  }

  ingestFile(
    absPath: string,
    corpus: RagDocumentMeta['corpus'] = 'custom',
    title?: string,
  ): RagDocumentMeta {
    const text = fs.readFileSync(absPath, 'utf8');
    return this.ingestText({
      sourcePath: absPath,
      text,
      corpus,
      title: title ?? path.basename(absPath),
      docId: this.docIdFor(corpus, absPath),
    });
  }

  ingestText(input: {
    docId?: string;
    sourcePath: string;
    text: string;
    corpus: RagDocumentMeta['corpus'];
    title?: string;
  }): RagDocumentMeta {
    const docId = input.docId ?? this.docIdFor(input.corpus, input.sourcePath);
    // Replace existing chunks for this doc
    for (const [id, c] of this.chunks) {
      if (c.docId === docId) this.chunks.delete(id);
    }

    const pieces = chunkText(input.text);
    const digest = sha256(input.text);
    const created: RagChunk[] = pieces.map((p, idx) => {
      const chunkId = `${docId}#${idx}`;
      const chunk: RagChunk = {
        chunkId,
        docId,
        sourcePath: input.sourcePath,
        corpus: input.corpus,
        text: p.text,
        offset: p.offset,
        tokensApprox: Math.ceil(p.text.length / 4),
        terms: tokenize(p.text),
        sha256: sha256(p.text),
      };
      this.chunks.set(chunkId, chunk);
      return chunk;
    });

    const meta: RagDocumentMeta = {
      docId,
      sourcePath: input.sourcePath,
      corpus: input.corpus,
      title: input.title ?? path.basename(input.sourcePath),
      bytes: Buffer.byteLength(input.text, 'utf8'),
      chunkCount: created.length,
      ingestedAt: new Date().toISOString(),
      sha256: digest,
    };
    this.documents.set(docId, meta);
    this.persist();
    return meta;
  }

  /** Chunk-only helper (does not index until ingest/rebuild). */
  chunk(text: string, chunkSize = 700, overlap = 80) {
    return chunkText(text, chunkSize, overlap).map((c, i) => ({
      index: i,
      offset: c.offset,
      text: c.text,
      tokensApprox: Math.ceil(c.text.length / 4),
    }));
  }

  index(): RagIndexStats {
    this.persist();
    return this.stats();
  }

  search(query: string, limit = 5): RagSearchHit[] {
    const terms = tokenize(query);
    if (!terms.length || this.chunks.size === 0) return [];
    const scored: RagSearchHit[] = [];
    for (const c of this.chunks.values()) {
      let score = 0;
      const hay = c.terms;
      for (const t of terms) {
        if (hay.includes(t)) score += 1;
      }
      if (/binary|search|sort|complexity/i.test(query) && /binary|search|tutor|complexity/i.test(c.text)) {
        score += 1;
      }
      if (/device|storage|boot/i.test(query) && c.corpus === 'device') score += 1;
      if (/waike|curriculum|course/i.test(query) && c.corpus === 'waike') score += 1;
      if (/archive|taxon|fossil|life/i.test(query) && c.corpus === 'archive') score += 1;
      if (score <= 0) continue;
      scored.push({
        chunkId: c.chunkId,
        docId: c.docId,
        sourcePath: c.sourcePath,
        corpus: c.corpus,
        score,
        excerpt: c.text.slice(0, 280),
        attribution: `${c.corpus}:${c.docId}#${c.offset}`,
      });
    }
    return scored
      .sort((a, b) => b.score - a.score || a.chunkId.localeCompare(b.chunkId))
      .slice(0, limit);
  }

  attribution(query: string, limit = 5): RagAttribution {
    const hits = this.search(query, limit);
    return {
      query,
      hits,
      attributionLines: hits.map(
        (h) => `[${h.score}] ${h.attribution} — ${h.excerpt.replace(/\s+/g, ' ').slice(0, 120)}`,
      ),
      grounded: hits.length > 0,
    };
  }

  delete(docId: string): boolean {
    if (!this.documents.has(docId)) return false;
    this.documents.delete(docId);
    for (const [id, c] of this.chunks) {
      if (c.docId === docId) this.chunks.delete(id);
    }
    this.persist();
    return true;
  }

  rebuild(opts?: { includeDefaults?: boolean }): RagIndexStats {
    this.documents.clear();
    this.chunks.clear();
    if (opts?.includeDefaults !== false) {
      this.ingestDefaultCorpora();
    }
    this.rebuiltAt = new Date().toISOString();
    this.persist();
    return this.stats();
  }

  ingestDefaultCorpora(): RagDocumentMeta[] {
    const roots: Array<{ root: string; corpus: RagDocumentMeta['corpus'] }> = [
      {
        root: path.join(this.cwd, 'fixtures', 'system-layer', 'rag-corpus'),
        corpus: 'system',
      },
      {
        root: path.join(this.cwd, 'fixtures', 'local-runtime', 'documents'),
        corpus: 'local-runtime',
      },
      {
        root: path.join(this.cwd, 'fixtures', 'system-layer', 'integrations', 'device-docs'),
        corpus: 'device',
      },
      {
        root: path.join(this.cwd, 'fixtures', 'system-layer', 'integrations', 'waike'),
        corpus: 'waike',
      },
      {
        root: path.join(this.cwd, 'fixtures', 'system-layer', 'integrations', 'archive'),
        corpus: 'archive',
      },
      {
        root: path.join(this.cwd, 'knowledge'),
        corpus: 'waike',
      },
    ];
    const metas: RagDocumentMeta[] = [];
    for (const { root, corpus } of roots) {
      for (const file of walkFiles(root)) {
        metas.push(this.ingestFile(file, corpus));
      }
    }
    return metas;
  }

  private docIdFor(corpus: string, sourcePath: string): string {
    const rel = path.relative(this.cwd, sourcePath).replace(/\\/g, '/');
    return `${corpus}:${rel || path.basename(sourcePath)}`;
  }

  private load(): void {
    if (!fs.existsSync(this.indexPath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.indexPath, 'utf8')) as PersistedIndex;
      this.documents = new Map(raw.documents.map((d) => [d.docId, d]));
      this.chunks = new Map(raw.chunks.map((c) => [c.chunkId, c]));
      this.rebuiltAt = raw.rebuiltAt;
    } catch {
      // corrupt index — leave empty; caller may rebuild
    }
  }

  private persist(): void {
    const payload: PersistedIndex = {
      schemaVersion: '1.0.0',
      documents: this.listDocuments(),
      chunks: [...this.chunks.values()],
      rebuiltAt: this.rebuiltAt,
    };
    fs.writeFileSync(this.indexPath, JSON.stringify(payload, null, 2));
  }
}

/** Back-compat helpers used by Continuance IV adapter. */
export function loadLocalRagCorpus(cwd = process.cwd()) {
  const engine = new LocalRagEngine(cwd, path.join(cwd, 'var', 'gunnchai', 'rag-compat'));
  if (engine.stats().documents === 0) engine.rebuild();
  return engine.listDocuments().map((d) => ({
    id: d.docId,
    text: fs.existsSync(d.sourcePath)
      ? fs.readFileSync(d.sourcePath, 'utf8').slice(0, 4000)
      : '',
    sourcePath: d.sourcePath,
  }));
}

export function retrieveForQuery(query: string, cwd = process.cwd(), limit = 5) {
  const engine = new LocalRagEngine(cwd);
  if (engine.stats().chunks === 0) engine.rebuild();
  return engine.search(query, limit).map((h) => ({
    id: h.docId,
    text: h.excerpt,
    sourcePath: h.sourcePath,
    score: h.score,
  }));
}

export { randomUUID };
