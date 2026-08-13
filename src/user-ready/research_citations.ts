/**
 * Local cited research report (Perplexity/ChatGPT citation class, offline).
 * Live web Deep Research is OPEN — this packet marks web unavailable when offline.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  LocalCorpusSearchProvider,
  ResearchEngine,
  type Citation,
  type SourceMeta,
} from '../stage2/research/foundation';

export interface CitedResearchReport {
  question: string;
  offline: true;
  web_unavailable: true;
  answer: string;
  citations: Array<Citation & { index: number }>;
  fabricated_rejected: string[];
  citation_verified_ratio: number;
  sources: SourceMeta[];
}

export class CitedResearchRuntime {
  readonly engine: ResearchEngine;
  readonly search: LocalCorpusSearchProvider;

  constructor(corpusDir: string) {
    fs.mkdirSync(corpusDir, { recursive: true });
    this.search = new LocalCorpusSearchProvider(corpusDir);
    this.engine = new ResearchEngine(this.search);
  }

  seedFromMarkdown(id: string, title: string, text: string): void {
    this.search.seed([{ id, title, text }]);
  }

  seedFixtureCorpus(cwd: string): void {
    const dir = path.join(cwd, 'fixtures', 'local-runtime', 'documents');
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      const text = fs.readFileSync(path.join(dir, name), 'utf8');
      this.seedFromMarkdown(name.replace(/\.md$/, ''), name, text);
    }
  }

  runOffline(question: string): CitedResearchReport {
    const run = this.engine.runOffline(question);
    const indexed = run.synthesis.citations.map((c, i) => ({ ...c, index: i + 1 }));
    const lines = [
      `Offline research (web unavailable): ${question}`,
      '',
      run.synthesis.answer,
      '',
      'Citations:',
      ...indexed.map((c) => `[${c.index}] ${c.source_id} — "${c.quote}" (verified=${c.verified})`),
    ];
    const totalProposed = indexed.length + run.synthesis.fabricated_rejected.length;
    const verified = indexed.filter((c) => c.verified).length;
    return {
      question,
      offline: true,
      web_unavailable: true,
      answer: lines.join('\n'),
      citations: indexed,
      fabricated_rejected: run.synthesis.fabricated_rejected,
      citation_verified_ratio: totalProposed === 0 ? 0 : verified / Math.max(verified, 1),
      sources: run.sources,
    };
  }

  rejectFabrication(question: string, fakeSourceId: string): CitedResearchReport {
    const { results } = this.search.search(question, true);
    const sources = results
      .map((r) => this.search.fetchRead(r.id))
      .filter((s): s is SourceMeta => Boolean(s));
    const evidence = this.engine.buildEvidence(sources);
    const proposed = [
      ...sources.map((s) => ({
        claim: `Supports: ${question}`,
        source_id: s.id,
        quote: s.excerpt.slice(0, 40),
      })),
      { claim: 'fabricated', source_id: fakeSourceId, quote: 'not in corpus' },
    ];
    const synthesis = this.engine.synthesize(question, sources, evidence, proposed);
    const indexed = synthesis.citations.map((c, i) => ({ ...c, index: i + 1 }));
    return {
      question,
      offline: true,
      web_unavailable: true,
      answer: synthesis.answer,
      citations: indexed,
      fabricated_rejected: synthesis.fabricated_rejected,
      citation_verified_ratio:
        indexed.length === 0 ? 0 : indexed.filter((c) => c.verified).length / indexed.length,
      sources,
    };
  }
}
