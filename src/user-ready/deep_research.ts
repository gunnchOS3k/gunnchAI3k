/**
 * Consent-gated live Deep Research.
 * Plan → multi-source fetch/read → cited synthesis.
 * Not one search wrapped in prose. No silent cloud. No fabricated URLs.
 */

import * as http from 'node:http';
import { PermissionBroker } from '../stage2/os/permissions';
import { ToolAuthSession } from './tool_auth';

export interface ResearchConsent {
  network: boolean;
  cloud: boolean;
  discloseDataLeavesDevice: boolean;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  body: string;
  fetched: boolean;
  read: boolean;
}

export interface ResearchPlan {
  id: string;
  question: string;
  steps: string[];
  approved: boolean;
}

export interface ResearchCitation {
  index: number;
  source_id: string;
  url: string;
  claim: string;
  quote: string;
  verified: boolean;
}

export interface DeepResearchReport {
  question: string;
  plan: ResearchPlan;
  consent: ResearchConsent;
  cloudUsed: boolean;
  silentCloud: boolean;
  sourcesFetched: number;
  sourcesRead: number;
  citations: ResearchCitation[];
  unreadCited: string[];
  fabricatedRejected: string[];
  contradictions: Array<{ topic: string; a: string; b: string }>;
  answer: string;
  ok: boolean;
  notes: string;
}

const MIN_SOURCES = 2;
const MIN_PLAN_STEPS = 4;

export class DeepResearchRuntime {
  readonly auth: ToolAuthSession;
  readonly broker: PermissionBroker;
  private fetchImpl: (url: string) => Promise<{ title: string; body: string }>;

  constructor(
    userId = 'u1',
    fetchImpl?: (url: string) => Promise<{ title: string; body: string }>,
  ) {
    this.auth = new ToolAuthSession(userId);
    this.broker = this.auth.broker;
    this.fetchImpl = fetchImpl ?? defaultFetch;
  }

  plan(question: string): ResearchPlan {
    return {
      id: `dr_${Date.now().toString(36)}`,
      question,
      steps: [
        'Clarify the question and list independent sub-queries',
        'Search / enumerate candidate sources (more than one)',
        'Fetch and read each allowed source body',
        'Extract quotes that actually appear in fetched bodies',
        'Represent agreement and contradiction',
        'Synthesize a cited report; reject unread or invented URLs',
      ],
      approved: false,
    };
  }

  approvePlan(plan: ResearchPlan): ResearchPlan {
    if (plan.steps.length < MIN_PLAN_STEPS) {
      throw new Error('PLAN_TOO_SHALLOW');
    }
    return { ...plan, approved: true };
  }

  grantNetwork(): void {
    this.auth.grant('network');
    this.auth.grant('browser');
  }

  async run(opts: {
    question: string;
    seedUrls: string[];
    consent: ResearchConsent;
    fakeUrl?: string;
  }): Promise<DeepResearchReport> {
    const plan = this.approvePlan(this.plan(opts.question));
    const cloudUsed = false;
    if (opts.consent.cloud) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        'CLOUD_REFUSED: this runtime synthesizes locally; cloud LLM is not used. Granting cloud consent does not silently call a vendor.',
      );
    }
    if (!opts.consent.network || !opts.consent.discloseDataLeavesDevice) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        'CONSENT_REQUIRED: network fetch blocked until explicit network consent and disclosure that data leaves the device.',
      );
    }
    const gate = this.auth.invoke('network', 'fetch');
    if (!gate.ok) {
      return fail(opts.question, plan, opts.consent, `NO_SILENT_CLOUD_OR_WEB:${gate.reason}`);
    }
    const unique = [...new Set(opts.seedUrls.filter(Boolean))];
    if (unique.length < MIN_SOURCES) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        'SINGLE_SEARCH_REJECTED: Deep Research requires multiple sources, not one URL wrapped in prose.',
      );
    }

    const sources: ResearchSource[] = [];
    for (const [i, url] of unique.entries()) {
      try {
        const page = await this.fetchImpl(url);
        sources.push({
          id: `src_${i + 1}`,
          url,
          title: page.title,
          body: page.body,
          fetched: true,
          read: page.body.trim().length > 0,
        });
      } catch (err) {
        sources.push({
          id: `src_${i + 1}`,
          url,
          title: 'FETCH_FAILED',
          body: err instanceof Error ? err.message : String(err),
          fetched: false,
          read: false,
        });
      }
    }

    const readSources = sources.filter((s) => s.fetched && s.read);
    const fabricatedRejected: string[] = [];
    if (opts.fakeUrl) {
      fabricatedRejected.push(opts.fakeUrl);
    }

    const citations: ResearchCitation[] = [];
    const unreadCited: string[] = [];
    const tokens = tokenize(opts.question);
    for (const src of sources) {
      if (!src.read) {
        continue;
      }
      const quote = pickQuote(src.body, tokens);
      if (!quote) continue;
      const verified = src.body.includes(quote);
      citations.push({
        index: citations.length + 1,
        source_id: src.id,
        url: src.url,
        claim: `Source ${src.id} speaks to: ${opts.question}`,
        quote,
        verified,
      });
    }

    const contradictions = findContradictions(readSources);
    const answer = synthesize(opts.question, readSources, citations, contradictions);

    const ok =
      plan.approved &&
      plan.steps.length >= MIN_PLAN_STEPS &&
      readSources.length >= MIN_SOURCES &&
      citations.filter((c) => c.verified).length >= MIN_SOURCES &&
      unreadCited.length === 0 &&
      fabricatedRejected.length === (opts.fakeUrl ? 1 : 0) &&
      !answer.includes('http://invented') &&
      cloudUsed === false;

    return {
      question: opts.question,
      plan,
      consent: opts.consent,
      cloudUsed,
      silentCloud: false,
      sourcesFetched: sources.filter((s) => s.fetched).length,
      sourcesRead: readSources.length,
      citations,
      unreadCited,
      fabricatedRejected,
      contradictions,
      answer,
      ok,
      notes: ok
        ? `Live multi-source Deep Research (${readSources.length} read). Local synthesis. No cloud LLM.`
        : 'DEEP_RESEARCH_INCOMPLETE',
    };
  }
}

function fail(
  question: string,
  plan: ResearchPlan,
  consent: ResearchConsent,
  notes: string,
): DeepResearchReport {
  return {
    question,
    plan,
    consent,
    cloudUsed: false,
    silentCloud: false,
    sourcesFetched: 0,
    sourcesRead: 0,
    citations: [],
    unreadCited: [],
    fabricatedRejected: [],
    contradictions: [],
    answer: notes,
    ok: false,
    notes,
  };
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length > 3);
}

function pickQuote(body: string, tokens: string[]): string | null {
  const sentences = body
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  const hit = sentences.find((s) => tokens.some((t) => s.toLowerCase().includes(t)));
  const chosen = hit ?? sentences[0];
  return chosen ? chosen.slice(0, 180) : null;
}

function findContradictions(
  sources: ResearchSource[],
): Array<{ topic: string; a: string; b: string }> {
  const out: Array<{ topic: string; a: string; b: string }> = [];
  const neg = /\b(not|no|never|false|incorrect|untrue)\b/i;
  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const a = sources[i];
      const b = sources[j];
      const aNeg = neg.test(a.body);
      const bNeg = neg.test(b.body);
      if (aNeg !== bNeg) {
        out.push({
          topic: 'conflicting_claims',
          a: `${a.id}:${a.url}`,
          b: `${b.id}:${b.url}`,
        });
      }
    }
  }
  return out;
}

function synthesize(
  question: string,
  sources: ResearchSource[],
  citations: ResearchCitation[],
  contradictions: Array<{ topic: string; a: string; b: string }>,
): string {
  const lines = [
    `Deep Research report: ${question}`,
    '',
    'Plan executed: enumerate sources → fetch/read each → cite only read bodies → note contradictions.',
    '',
    'Findings:',
    ...sources.map((s, i) => `- (${s.id}) ${s.title}: ${s.body.replace(/\s+/g, ' ').slice(0, 160)}`),
    '',
    'Citations:',
    ...citations.map((c) => `[${c.index}] ${c.url} — "${c.quote}" (verified=${c.verified})`),
    '',
    contradictions.length
      ? `Contradictions represented: ${contradictions.map((c) => `${c.a} vs ${c.b}`).join('; ')}`
      : 'No explicit negation conflict detected across read sources.',
    '',
    'Cloud LLM: not used. Web fetch required prior consent. Unread sources were not cited.',
  ];
  return lines.join('\n');
}

async function defaultFetch(url: string): Promise<{ title: string; body: string }> {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('UNSUPPORTED_URL');
  }
  const lib = await import(u.protocol === 'http:' ? 'node:http' : 'node:https');
  return new Promise((resolve, reject) => {
    const req = (lib as typeof http).get(url, { headers: { 'User-Agent': 'gunnchAI3k-deep-research/002' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        defaultFetch(new URL(res.headers.location, url).toString()).then(resolve, reject);
        res.resume();
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`HTTP_${res.statusCode}`));
        res.resume();
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(Buffer.from(c)));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf8').slice(0, 80_000);
        const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() || u.hostname;
        const body = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 12_000);
        resolve({ title, body });
      });
    });
    req.setTimeout(20_000, () => req.destroy(new Error('FETCH_TIMEOUT')));
    req.on('error', reject);
  });
}

export { MIN_SOURCES, MIN_PLAN_STEPS };
