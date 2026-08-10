/**
 * Research foundation: search, fetch/read, citation, plan, evidence, synthesis.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SourceMeta {
  id: string;
  title: string;
  uri: string;
  local: boolean;
  retrieved_at: string;
  excerpt: string;
}

export interface Citation {
  id: string;
  source_id: string;
  claim: string;
  quote: string;
  verified: boolean;
}

export interface ResearchPlan {
  id: string;
  question: string;
  steps: string[];
  offline: boolean;
  web_unavailable: boolean;
}

export interface EvidenceEntry {
  id: string;
  source_id: string;
  text: string;
  weight: number;
}

export interface SynthesisResult {
  answer: string;
  citations: Citation[];
  evidence_ids: string[];
  fabricated_rejected: string[];
}

export class LocalCorpusSearchProvider {
  constructor(private readonly corpusDir: string) {
    fs.mkdirSync(corpusDir, { recursive: true });
  }

  seed(docs: Array<{ id: string; title: string; text: string }>): void {
    for (const d of docs) {
      fs.writeFileSync(
        path.join(this.corpusDir, `${d.id}.json`),
        JSON.stringify({ ...d, uri: `local://corpus/${d.id}` }, null, 2),
      );
    }
  }

  search(query: string, offline: boolean): { results: SourceMeta[]; web_unavailable: boolean } {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results: SourceMeta[] = [];
    for (const name of fs.readdirSync(this.corpusDir)) {
      if (!name.endsWith('.json')) continue;
      const doc = JSON.parse(fs.readFileSync(path.join(this.corpusDir, name), 'utf8')) as {
        id: string;
        title: string;
        text: string;
        uri: string;
      };
      const hay = `${doc.title}\n${doc.text}`.toLowerCase();
      if (tokens.some((t) => hay.includes(t))) {
        results.push({
          id: doc.id,
          title: doc.title,
          uri: doc.uri,
          local: true,
          retrieved_at: new Date().toISOString(),
          excerpt: doc.text.slice(0, 240),
        });
      }
    }
    return { results, web_unavailable: offline };
  }

  fetchRead(sourceId: string): SourceMeta | null {
    const file = path.join(this.corpusDir, `${sourceId}.json`);
    if (!fs.existsSync(file)) return null;
    const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      id: string;
      title: string;
      text: string;
      uri: string;
    };
    return {
      id: doc.id,
      title: doc.title,
      uri: doc.uri,
      local: true,
      retrieved_at: new Date().toISOString(),
      excerpt: doc.text,
    };
  }
}

export class ResearchEngine {
  constructor(private readonly search: LocalCorpusSearchProvider) {}

  plan(question: string, offline: boolean): ResearchPlan {
    return {
      id: `plan_${crypto.randomBytes(4).toString('hex')}`,
      question,
      steps: [
        'Search local corpus',
        offline ? 'Skip web (offline)' : 'Optionally consult web if permitted',
        'Fetch/read sources',
        'Build evidence ledger',
        'Synthesize with citations',
      ],
      offline,
      web_unavailable: offline,
    };
  }

  buildEvidence(sources: SourceMeta[]): EvidenceEntry[] {
    return sources.map((s, i) => ({
      id: `ev_${i}_${s.id}`,
      source_id: s.id,
      text: s.excerpt,
      weight: 1 / (i + 1),
    }));
  }

  cite(claim: string, source: SourceMeta, quote: string): Citation {
    const ok = source.excerpt.toLowerCase().includes(quote.toLowerCase()) || quote.length === 0;
    return {
      id: `cite_${crypto.randomBytes(3).toString('hex')}`,
      source_id: source.id,
      claim,
      quote,
      verified: ok && Boolean(source.id),
    };
  }

  synthesize(
    question: string,
    sources: SourceMeta[],
    evidence: EvidenceEntry[],
    proposedCitations: Array<{ claim: string; source_id: string; quote: string }>,
  ): SynthesisResult {
    const byId = new Map(sources.map((s) => [s.id, s]));
    const citations: Citation[] = [];
    const fabricated_rejected: string[] = [];
    for (const p of proposedCitations) {
      const src = byId.get(p.source_id);
      if (!src) {
        fabricated_rejected.push(p.source_id);
        continue;
      }
      const c = this.cite(p.claim, src, p.quote);
      if (!c.verified) {
        fabricated_rejected.push(p.source_id);
        continue;
      }
      citations.push(c);
    }
    const answer = [
      `Research answer for: ${question}`,
      ...evidence.slice(0, 3).map((e) => `- (${e.source_id}) ${e.text.slice(0, 160)}`),
      citations.length
        ? `Citations: ${citations.map((c) => c.source_id).join(', ')}`
        : 'No verified citations.',
    ].join('\n');
    return {
      answer,
      citations,
      evidence_ids: evidence.map((e) => e.id),
      fabricated_rejected,
    };
  }

  runOffline(question: string): {
    plan: ResearchPlan;
    sources: SourceMeta[];
    evidence: EvidenceEntry[];
    synthesis: SynthesisResult;
  } {
    const plan = this.plan(question, true);
    const { results } = this.search.search(question, true);
    const sources = results.map((r) => this.search.fetchRead(r.id)!).filter(Boolean);
    const evidence = this.buildEvidence(sources);
    const proposed = sources.map((s) => ({
      claim: `Supports aspects of: ${question}`,
      source_id: s.id,
      quote: s.excerpt.slice(0, 40),
    }));
    // Inject a fabricated citation attempt for integrity path testing callers may also do.
    const synthesis = this.synthesize(question, sources, evidence, proposed);
    return { plan, sources, evidence, synthesis };
  }
}
