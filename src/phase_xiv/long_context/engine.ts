/**
 * Long-context engine: retrieval + summarization + project memory.
 * Does not claim unsupported token / million-token equivalence.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ContextChunk {
  id: string;
  source: string;
  text: string;
  score: number;
}

export interface LongContextResult {
  mode: 'direct' | 'retrieval' | 'summarization' | 'project_memory' | 'hybrid';
  chunks: ContextChunk[];
  summary: string;
  claimed_context_tokens: number | null;
  supported_context_tokens: number;
  notes: string[];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreOverlap(query: string, doc: string): number {
  const q = new Set(tokenize(query));
  const d = tokenize(doc);
  if (q.size === 0 || d.length === 0) return 0;
  let hit = 0;
  for (const t of d) if (q.has(t)) hit += 1;
  return hit / Math.sqrt(d.length);
}

export class LongContextEngine {
  private projectMemory = new Map<string, string[]>();

  constructor(
    private readonly rootDir: string,
    /** Honest local window — not a fabricated million-token claim */
    private readonly supportedContextTokens = 8192,
  ) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

  ingest(projectId: string, docs: Array<{ source: string; text: string }>): number {
    const dir = path.join(this.rootDir, projectId);
    fs.mkdirSync(dir, { recursive: true });
    const mem: string[] = [];
    for (const doc of docs) {
      const id = crypto.randomBytes(4).toString('hex');
      const file = path.join(dir, `${id}.txt`);
      fs.writeFileSync(file, doc.text);
      mem.push(`${doc.source}\n${doc.text}`);
    }
    this.projectMemory.set(projectId, [...(this.projectMemory.get(projectId) || []), ...mem]);
    return docs.length;
  }

  retrieve(projectId: string, query: string, k = 5): ContextChunk[] {
    const dir = path.join(this.rootDir, projectId);
    if (!fs.existsSync(dir)) return [];
    const chunks: ContextChunk[] = [];
    for (const name of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, name), 'utf8');
      chunks.push({
        id: name,
        source: name,
        text,
        score: scoreOverlap(query, text),
      });
    }
    return chunks.sort((a, b) => b.score - a.score).slice(0, k);
  }

  summarize(texts: string[], maxChars = 800): string {
    const joined = texts.join('\n').replace(/\s+/g, ' ').trim();
    if (joined.length <= maxChars) return joined;
    return joined.slice(0, maxChars - 15) + ' …[summarized]';
  }

  assemble(projectId: string, query: string, directContext?: string): LongContextResult {
    const notes: string[] = [
      'No unsupported million-token equivalence claims.',
      `supported_context_tokens=${this.supportedContextTokens}`,
    ];
    const retrieved = this.retrieve(projectId, query, 5);
    const mem = this.projectMemory.get(projectId) || [];
    const summary = this.summarize([
      ...(directContext ? [directContext] : []),
      ...retrieved.map((c) => c.text),
      ...mem.slice(-2),
    ]);
    const estTokens = Math.ceil(summary.length / 4);
    return {
      mode: retrieved.length ? 'hybrid' : directContext ? 'direct' : 'project_memory',
      chunks: retrieved,
      summary,
      claimed_context_tokens: null,
      supported_context_tokens: this.supportedContextTokens,
      notes: [...notes, `assembled_est_tokens=${estTokens}`],
    };
  }
}
