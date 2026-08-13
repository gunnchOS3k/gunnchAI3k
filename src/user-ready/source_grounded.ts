/**
 * NotebookLM-class source-grounded Q&A: answer only from attached sources.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalRagEngine } from '../system-layer/product_service/rag_engine';

export interface SourceGroundedAnswer {
  grounded: boolean;
  answer: string;
  citations: Array<{ sourcePath: string; excerpt: string }>;
  refusedUngrounded: boolean;
}

export class SourceGroundedNotebook {
  readonly rag: LocalRagEngine;

  constructor(cwd: string, storeDir: string) {
    this.rag = new LocalRagEngine(cwd, storeDir);
  }

  attach(sourcePath: string, title: string, text: string): void {
    this.rag.ingestText({
      sourcePath,
      corpus: 'custom',
      title,
      text,
    });
  }

  attachFile(absPath: string): void {
    const text = fs.readFileSync(absPath, 'utf8');
    this.attach(absPath, path.basename(absPath), text);
  }

  ask(question: string): SourceGroundedAnswer {
    const attr = this.rag.attribution(question);
    if (!attr.grounded || attr.hits.length === 0) {
      return {
        grounded: false,
        answer:
          'I cannot answer from the attached sources. No matching excerpt was found. I will not invent a citation.',
        citations: [],
        refusedUngrounded: true,
      };
    }
    const citations = attr.hits.slice(0, 3).map((h) => ({
      sourcePath: h.sourcePath,
      excerpt: h.excerpt.slice(0, 240),
    }));
    return {
      grounded: true,
      answer: [
        `Grounded in attached sources (${citations.length}):`,
        ...citations.map((c, i) => `[${i + 1}] ${path.basename(c.sourcePath)}: ${c.excerpt}`),
      ].join('\n'),
      citations,
      refusedUngrounded: false,
    };
  }
}
