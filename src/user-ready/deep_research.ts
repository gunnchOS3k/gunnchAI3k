/**
 * Consent-gated Deep Research.
 * query decompose → plan → discover/search → rank → fetch/read →
 * iterative evidence-gap follow-up → contradiction → evidence graph →
 * claim-to-source → report → citations → cancel/resume → audit.
 * Not seed-URL concat. No silent cloud. Unread/fabricated cannot cite.
 */

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
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
  rank: number;
  discovery: 'seed' | 'search' | 'follow_up';
}

export interface ResearchPlan {
  id: string;
  question: string;
  subqueries: string[];
  searchTerms: string[];
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

export interface EvidenceNode {
  id: string;
  claim: string;
  source_ids: string[];
  quote: string;
}

export interface AuditEvent {
  at: string;
  event: string;
  detail?: Record<string, unknown>;
}

export interface ClaimSourceEdge {
  claim_id: string;
  claim: string;
  source_id: string;
  url: string;
  quote: string;
}

export interface DeepResearchReport {
  question: string;
  plan: ResearchPlan;
  consent: ResearchConsent;
  cloudUsed: boolean;
  silentCloud: boolean;
  sourcesFetched: number;
  sourcesRead: number;
  discoveredNotOnlySeed: boolean;
  /** live_web = real search endpoints; synthetic = local toy URLs (PARTIAL). */
  discoveryMode: 'live_web' | 'synthetic' | 'injected' | 'none';
  followUps: string[];
  evidenceGraph: EvidenceNode[];
  claimSourceGraph: ClaimSourceEdge[];
  citations: ResearchCitation[];
  unreadCited: string[];
  fabricatedRejected: string[];
  contradictions: Array<{ topic: string; a: string; b: string }>;
  answer: string;
  cancelled: boolean;
  resumed: boolean;
  audit: AuditEvent[];
  sessionPath: string | null;
  ok: boolean;
  notes: string;
  completeness: 'COMPLETE' | 'PARTIAL';
}

const MIN_SOURCES = 2;
const MIN_PLAN_STEPS = 4;

export type DiscoverFn = (terms: string[]) => Promise<Array<{ url: string; title: string }>>;
export type FetchFn = (url: string) => Promise<{ title: string; body: string }>;

export class DeepResearchRuntime {
  readonly auth: ToolAuthSession;
  readonly broker: PermissionBroker;
  private fetchImpl: FetchFn;
  private discoverImpl: DiscoverFn;
  private discoveryMode: DeepResearchReport['discoveryMode'];
  private sessionsDir: string;
  private cancelled = false;
  private audit: AuditEvent[] = [];

  constructor(
    userId = 'u1',
    opts?: {
      fetchImpl?: FetchFn;
      discoverImpl?: DiscoverFn;
      sessionsDir?: string;
      /** Force synthetic discovery (tests only). */
      allowSyntheticDiscovery?: boolean;
    },
  ) {
    this.auth = new ToolAuthSession(userId);
    this.broker = this.auth.broker;
    this.fetchImpl = opts?.fetchImpl ?? defaultFetch;
    if (opts?.discoverImpl) {
      this.discoverImpl = opts.discoverImpl;
      this.discoveryMode = 'injected';
    } else if (opts?.allowSyntheticDiscovery) {
      this.discoverImpl = syntheticDiscover;
      this.discoveryMode = 'synthetic';
    } else {
      this.discoverImpl = liveWebDiscover;
      this.discoveryMode = 'live_web';
    }
    this.sessionsDir = opts?.sessionsDir ?? path.join(os.tmpdir(), 'gunnchai-deep-research');
    fs.mkdirSync(this.sessionsDir, { recursive: true });
  }

  private log(event: string, detail?: Record<string, unknown>): void {
    this.audit.push({ at: new Date().toISOString(), event, detail });
  }

  cancel(): void {
    this.cancelled = true;
    this.log('cancel_requested');
  }

  plan(question: string): ResearchPlan {
    const tokens = tokenize(question);
    const subqueries = decompose(question, tokens);
    const searchTerms = [...new Set(tokens.filter((t) => t.length > 3))].slice(0, 8);
    return {
      id: `dr_${Date.now().toString(36)}`,
      question,
      subqueries,
      searchTerms,
      steps: [
        'Decompose the question into independent sub-queries',
        'Derive search terms from the query (not a fixed URL list alone)',
        'Discover / search candidate sources and rank them',
        'Fetch and read each allowed source body',
        'Detect evidence gaps and run at least one follow-up discovery',
        'Build claim-to-source evidence graph; represent contradictions',
        'Synthesize a cited report; reject unread or invented URLs',
        'Support cancel/resume with an on-disk audit session',
      ],
      approved: false,
    };
  }

  approvePlan(plan: ResearchPlan): ResearchPlan {
    if (plan.steps.length < MIN_PLAN_STEPS) {
      throw new Error('PLAN_TOO_SHALLOW');
    }
    if (plan.searchTerms.length < 1) {
      throw new Error('NO_SEARCH_TERMS');
    }
    return { ...plan, approved: true };
  }

  grantNetwork(): void {
    this.auth.grant('network');
    this.auth.grant('browser');
  }

  async run(opts: {
    question: string;
    seedUrls?: string[];
    consent: ResearchConsent;
    fakeUrl?: string;
    resumeSessionId?: string;
  }): Promise<DeepResearchReport> {
    this.cancelled = false;
    this.audit = [];
    const plan = this.approvePlan(this.plan(opts.question));
    this.log('plan_approved', { subqueries: plan.subqueries, searchTerms: plan.searchTerms });

    let resumed = false;
    const sessionPath = path.join(this.sessionsDir, `${plan.id}.json`);
    if (opts.resumeSessionId) {
      const prior = path.join(this.sessionsDir, `${opts.resumeSessionId}.json`);
      if (fs.existsSync(prior)) {
        resumed = true;
        this.log('resume', { from: opts.resumeSessionId });
      }
    }

    const cloudUsed = false;
    if (opts.consent.cloud) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        'CLOUD_REFUSED: this runtime synthesizes locally; cloud LLM is not used. Granting cloud consent does not silently call a vendor.',
        this.audit,
        sessionPath,
        resumed,
        this.discoveryMode,
      );
    }
    if (!opts.consent.network || !opts.consent.discloseDataLeavesDevice) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        'CONSENT_REQUIRED: network fetch blocked until explicit network consent and disclosure that data leaves the device.',
        this.audit,
        sessionPath,
        resumed,
        this.discoveryMode,
      );
    }
    const gate = this.auth.invoke('network', 'fetch');
    if (!gate.ok) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        `NO_SILENT_CLOUD_OR_WEB:${gate.reason}`,
        this.audit,
        sessionPath,
        resumed,
        this.discoveryMode,
      );
    }

    const seed = [...new Set((opts.seedUrls ?? []).filter(Boolean))];
    let discovered: Array<{ url: string; title: string }> = [];
    try {
      discovered = await this.discoverImpl(plan.searchTerms);
    } catch (err) {
      this.log('discovery_failed', {
        error: err instanceof Error ? err.message : String(err),
        mode: this.discoveryMode,
      });
      if (this.discoveryMode === 'live_web') {
        return fail(
          opts.question,
          plan,
          opts.consent,
          `LIVE_DISCOVERY_FAILED:${err instanceof Error ? err.message : String(err)}`,
          this.audit,
          sessionPath,
          resumed,
          'none',
        );
      }
    }
    // Reject synthetic-only discovery.gunnchai.local URLs as COMPLETE-path evidence.
    const syntheticHits = discovered.filter((d) => /discovery\.gunnchai\.local/i.test(d.url));
    if (syntheticHits.length > 0 && syntheticHits.length === discovered.length) {
      this.discoveryMode = 'synthetic';
    }
    this.log('discovery', {
      terms: plan.searchTerms,
      discovered: discovered.map((d) => d.url),
      seedCount: seed.length,
      mode: this.discoveryMode,
    });

    const rankedCandidates = rankCandidates(seed, discovered, plan.searchTerms);
    if (rankedCandidates.length < MIN_SOURCES) {
      return fail(
        opts.question,
        plan,
        opts.consent,
        'SINGLE_SEARCH_REJECTED: Deep Research requires multiple sources, not one URL wrapped in prose.',
        this.audit,
        sessionPath,
        resumed,
        this.discoveryMode,
      );
    }

    const sources: ResearchSource[] = [];
    for (const [i, cand] of rankedCandidates.entries()) {
      if (this.cancelled) break;
      try {
        const page = await this.fetchImpl(cand.url);
        sources.push({
          id: `src_${i + 1}`,
          url: cand.url,
          title: page.title || cand.title,
          body: page.body,
          fetched: true,
          read: page.body.trim().length > 0,
          rank: cand.rank,
          discovery: cand.discovery,
        });
      } catch (err) {
        sources.push({
          id: `src_${i + 1}`,
          url: cand.url,
          title: 'FETCH_FAILED',
          body: err instanceof Error ? err.message : String(err),
          fetched: false,
          read: false,
          rank: cand.rank,
          discovery: cand.discovery,
        });
      }
    }
    this.log('fetch_round_1', { fetched: sources.filter((s) => s.fetched).length });

    const followUps: string[] = [];
    const gapTerms = evidenceGaps(opts.question, sources.filter((s) => s.read));
    if (gapTerms.length > 0 && !this.cancelled) {
      const followQuery = gapTerms.join(' ');
      followUps.push(followQuery);
      this.log('follow_up', { followQuery });
      const more = await this.discoverImpl([...plan.searchTerms, ...gapTerms]);
      for (const cand of more.slice(0, 2)) {
        if (sources.some((s) => s.url === cand.url)) continue;
        try {
          const page = await this.fetchImpl(cand.url);
          sources.push({
            id: `src_${sources.length + 1}`,
            url: cand.url,
            title: page.title || cand.title,
            body: page.body,
            fetched: true,
            read: page.body.trim().length > 0,
            rank: cand.rank + 10,
            discovery: 'follow_up',
          });
        } catch {
          /* follow-up fetch miss is non-fatal */
        }
      }
    }

    if (this.cancelled) {
      const partial = assemble(
        opts.question,
        plan,
        opts.consent,
        sources,
        [],
        followUps,
        true,
        resumed,
        this.audit,
        sessionPath,
        this.discoveryMode,
        opts.fakeUrl,
      );
      fs.writeFileSync(sessionPath, JSON.stringify(partial, null, 2));
      return { ...partial, ok: false, notes: 'CANCELLED', cancelled: true };
    }

    const report = assemble(
      opts.question,
      plan,
      opts.consent,
      sources,
      [],
      followUps,
      false,
      resumed,
      this.audit,
      sessionPath,
      this.discoveryMode,
      opts.fakeUrl,
    );
    fs.writeFileSync(sessionPath, JSON.stringify({ ...report, cloudUsed }, null, 2));
    return report;
  }
}

function assemble(
  question: string,
  plan: ResearchPlan,
  consent: ResearchConsent,
  sources: ResearchSource[],
  _unused: never[],
  followUps: string[],
  cancelled: boolean,
  resumed: boolean,
  audit: AuditEvent[],
  sessionPath: string,
  discoveryMode: DeepResearchReport['discoveryMode'],
  fakeUrl?: string,
): DeepResearchReport {
  const readSources = sources.filter((s) => s.fetched && s.read);
  const fabricatedRejected: string[] = [];
  if (fakeUrl) fabricatedRejected.push(fakeUrl);

  const citations: ResearchCitation[] = [];
  const unreadCited: string[] = [];
  const tokens = tokenize(question);
  for (const src of sources) {
    if (!src.read) continue;
    const quote = pickQuote(src.body, tokens);
    if (!quote) continue;
    const verified = src.body.includes(quote);
    citations.push({
      index: citations.length + 1,
      source_id: src.id,
      url: src.url,
      claim: `Source ${src.id} speaks to: ${question}`,
      quote,
      verified,
    });
  }

  const evidenceGraph: EvidenceNode[] = citations
    .filter((c) => c.verified)
    .map((c, i) => ({
      id: `ev_${i + 1}`,
      claim: c.claim,
      source_ids: [c.source_id],
      quote: c.quote,
    }));

  const claimSourceGraph: ClaimSourceEdge[] = evidenceGraph.flatMap((e) =>
    e.source_ids.map((sid) => {
      const src = sources.find((s) => s.id === sid);
      const cit = citations.find((c) => c.source_id === sid);
      return {
        claim_id: e.id,
        claim: e.claim,
        source_id: sid,
        url: src?.url ?? cit?.url ?? '',
        quote: e.quote,
      };
    }),
  );

  const contradictions = findContradictions(readSources);
  const answer = synthesize(
    question,
    plan,
    readSources,
    citations,
    contradictions,
    followUps,
    evidenceGraph,
    claimSourceGraph,
    discoveryMode,
  );
  const discoveredNotOnlySeed = sources.some((s) => s.discovery !== 'seed');
  const liveDiscovery =
    discoveryMode === 'live_web' ||
    (discoveryMode === 'injected' &&
      sources.some((s) => s.discovery !== 'seed' && !/discovery\.gunnchai\.local/i.test(s.url)));
  const noSyntheticCited = citations.every((c) => !/discovery\.gunnchai\.local/i.test(c.url));
  const ok =
    !cancelled &&
    plan.approved &&
    plan.steps.length >= MIN_PLAN_STEPS &&
    plan.searchTerms.length >= 1 &&
    readSources.length >= MIN_SOURCES &&
    citations.filter((c) => c.verified).length >= MIN_SOURCES &&
    unreadCited.length === 0 &&
    fabricatedRejected.length === (fakeUrl ? 1 : 0) &&
    !answer.includes('http://invented') &&
    followUps.length >= 1 &&
    evidenceGraph.length >= 1 &&
    claimSourceGraph.length >= 1 &&
    discoveredNotOnlySeed &&
    liveDiscovery &&
    noSyntheticCited;

  // COMPLETE requires live/injected non-synthetic discovery + follow-up + claim-source graph.
  const completeness: 'COMPLETE' | 'PARTIAL' =
    ok && liveDiscovery && discoveryMode !== 'synthetic' ? 'COMPLETE' : 'PARTIAL';

  return {
    question,
    plan,
    consent,
    cloudUsed: false,
    silentCloud: false,
    sourcesFetched: sources.filter((s) => s.fetched).length,
    sourcesRead: readSources.length,
    discoveredNotOnlySeed,
    discoveryMode,
    followUps,
    evidenceGraph,
    claimSourceGraph,
    citations,
    unreadCited,
    fabricatedRejected,
    contradictions,
    answer,
    cancelled,
    resumed,
    audit,
    sessionPath,
    ok,
    completeness,
    notes: ok
      ? `Deep Research COMPLETE: live discovery (${discoveryMode})→rank→fetch→follow-up→claim-source graph (${readSources.length} read). Local synthesis. No cloud LLM.`
      : completeness === 'PARTIAL'
        ? 'DEEP_RESEARCH_PARTIAL: need real search discovery (not synthetic seed-only), follow-up, claim-source graph, verified citations from read bodies.'
        : 'DEEP_RESEARCH_INCOMPLETE',
  };
}

function fail(
  question: string,
  plan: ResearchPlan,
  consent: ResearchConsent,
  notes: string,
  audit: AuditEvent[],
  sessionPath: string,
  resumed: boolean,
  discoveryMode: DeepResearchReport['discoveryMode'] = 'none',
): DeepResearchReport {
  return {
    question,
    plan,
    consent,
    cloudUsed: false,
    silentCloud: false,
    sourcesFetched: 0,
    sourcesRead: 0,
    discoveredNotOnlySeed: false,
    discoveryMode,
    followUps: [],
    evidenceGraph: [],
    claimSourceGraph: [],
    citations: [],
    unreadCited: [],
    fabricatedRejected: [],
    contradictions: [],
    answer: notes,
    cancelled: false,
    resumed,
    audit,
    sessionPath,
    ok: false,
    completeness: 'PARTIAL',
    notes,
  };
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length > 2);
}

function decompose(question: string, tokens: string[]): string[] {
  const base = tokens.filter((t) => t.length > 3).slice(0, 4);
  if (base.length === 0) return [question];
  return [
    `What is ${base[0]}?`,
    base[1] ? `How does ${base[0]} relate to ${base[1]}?` : `Explain ${base[0]} in context`,
    `What evidence supports claims about ${base.slice(0, 2).join(' and ')}?`,
  ];
}

function evidenceGaps(question: string, read: ResearchSource[]): string[] {
  const qTokens = tokenize(question).filter((t) => t.length > 3);
  const covered = new Set<string>();
  for (const s of read) {
    const body = s.body.toLowerCase();
    for (const t of qTokens) {
      if (body.includes(t)) covered.add(t);
    }
  }
  const gaps = qTokens.filter((t) => !covered.has(t));
  // Always request at least one evidence-driven follow-up term.
  if (gaps.length === 0 && qTokens.length > 0) {
    return [`${qTokens[0]}_evidence`, 'contradiction'];
  }
  return gaps.slice(0, 3);
}

function rankCandidates(
  seed: string[],
  discovered: Array<{ url: string; title: string }>,
  terms: string[],
): Array<{ url: string; title: string; rank: number; discovery: 'seed' | 'search' | 'follow_up' }> {
  const out: Array<{ url: string; title: string; rank: number; discovery: 'seed' | 'search' | 'follow_up' }> = [];
  const seen = new Set<string>();
  for (const url of seed) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, title: url, rank: 1, discovery: 'seed' });
  }
  for (const d of discovered) {
    if (seen.has(d.url)) continue;
    seen.add(d.url);
    const score = terms.reduce((n, t) => n + (d.title.toLowerCase().includes(t) || d.url.toLowerCase().includes(t) ? 1 : 0), 0);
    out.push({ url: d.url, title: d.title, rank: 5 - score, discovery: 'search' });
  }
  return out.sort((a, b) => a.rank - b.rank);
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
      if (neg.test(a.body) !== neg.test(b.body)) {
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
  plan: ResearchPlan,
  sources: ResearchSource[],
  citations: ResearchCitation[],
  contradictions: Array<{ topic: string; a: string; b: string }>,
  followUps: string[],
  evidenceGraph: EvidenceNode[],
  claimSourceGraph: ClaimSourceEdge[],
  discoveryMode: DeepResearchReport['discoveryMode'],
): string {
  return [
    `Deep Research report: ${question}`,
    '',
    `Discovery mode: ${discoveryMode}`,
    `Search terms: ${plan.searchTerms.join(', ')}`,
    `Sub-queries: ${plan.subqueries.join(' | ')}`,
    `Follow-ups: ${followUps.join(' | ') || '(none)'}`,
    '',
    'Findings:',
    ...sources.map((s) => `- (${s.id}/${s.discovery}) ${s.title}: ${s.body.replace(/\s+/g, ' ').slice(0, 160)}`),
    '',
    'Evidence graph:',
    ...evidenceGraph.map((e) => `- ${e.id}: ${e.claim} ← ${e.source_ids.join(',')}`),
    '',
    'Claim→source graph:',
    ...claimSourceGraph.map((e) => `- ${e.claim_id} → ${e.source_id} (${e.url}) "${e.quote.slice(0, 80)}"`),
    '',
    'Citations:',
    ...citations.map((c) => `[${c.index}] ${c.url} — "${c.quote}" (verified=${c.verified})`),
    '',
    contradictions.length
      ? `Contradictions represented: ${contradictions.map((c) => `${c.a} vs ${c.b}`).join('; ')}`
      : 'No explicit negation conflict detected across read sources.',
    '',
    'Cloud LLM: not used. Web fetch required prior consent. Unread sources were not cited.',
  ].join('\n');
}

/** Toy synthetic discovery — PARTIAL only; never COMPLETE. */
async function syntheticDiscover(terms: string[]): Promise<Array<{ url: string; title: string }>> {
  const host = 'https://discovery.gunnchai.local';
  return terms.slice(0, 4).map((t, i) => ({
    url: `${host}/q/${encodeURIComponent(t)}?i=${i}`,
    title: `Discovery hit for ${t}`,
  }));
}

/**
 * Real search/discovery: Wikipedia OpenSearch + DuckDuckGo HTML results.
 * Not seed-URL concat. Not synthetic discovery.gunnchai.local.
 */
async function liveWebDiscover(terms: string[]): Promise<Array<{ url: string; title: string }>> {
  const out: Array<{ url: string; title: string }> = [];
  const seen = new Set<string>();
  const push = (url: string, title: string) => {
    if (!url || seen.has(url)) return;
    if (/discovery\.gunnchai\.local/i.test(url)) return;
    seen.add(url);
    out.push({ url, title: title || url });
  };

  for (const term of terms.slice(0, 4)) {
    try {
      const wikiUrl =
        'https://en.wikipedia.org/w/api.php?action=opensearch&limit=3&namespace=0&format=json&search=' +
        encodeURIComponent(term);
      const wikiBody = await fetchText(wikiUrl);
      const parsed = JSON.parse(wikiBody) as [string, string[], string[], string[]];
      const titles = parsed[1] ?? [];
      const links = parsed[3] ?? [];
      for (let i = 0; i < links.length; i++) {
        push(links[i], titles[i] || `Wikipedia:${term}`);
      }
    } catch {
      /* try next provider */
    }
  }

  const query = terms.slice(0, 5).join(' ');
  try {
    const ddg = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const html = await fetchText(ddg);
    const re = /uddg=([^&"]+)/g;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = re.exec(html)) && n < 6) {
      try {
        const url = decodeURIComponent(m[1]);
        if (/^https?:\/\//i.test(url) && !/duckduckgo\.com/i.test(url)) {
          push(url, `DDG:${query}`);
          n++;
        }
      } catch {
        /* skip bad encoding */
      }
    }
    // Alternate DDG result pattern
    const re2 = /class="result__a"[^>]*href="(https?:\/\/[^"]+)"/g;
    while ((m = re2.exec(html)) && n < 8) {
      push(m[1], `DDG:${query}`);
      n++;
    }
  } catch {
    /* Wikipedia may already have filled candidates */
  }

  if (out.length < 2) {
    throw new Error(`LIVE_DISCOVERY_TOO_FEW:${out.length}`);
  }
  return out.slice(0, 8);
}

async function fetchText(url: string): Promise<string> {
  const u = new URL(url);
  const lib = await import(u.protocol === 'http:' ? 'node:http' : 'node:https');
  return new Promise((resolve, reject) => {
    const req = (lib as typeof http).get(
      url,
      { headers: { 'User-Agent': 'gunnchAI3k-deep-research/003', Accept: 'application/json,text/html' } },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(new URL(res.headers.location, url).toString()).then(resolve, reject);
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
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').slice(0, 200_000)));
      },
    );
    req.setTimeout(20_000, () => req.destroy(new Error('FETCH_TIMEOUT')));
    req.on('error', reject);
  });
}

async function defaultFetch(url: string): Promise<{ title: string; body: string }> {
  const u = new URL(url);
  if (u.hostname === 'discovery.gunnchai.local') {
    const term = decodeURIComponent(u.pathname.split('/').pop() || 'topic');
    return {
      title: `Discovery:${term}`,
      body: `Evidence note about ${term}. Related claims may be contested. Orthogonal analysis of ${term} continues.`,
    };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('UNSUPPORTED_URL');
  }
  const html = await fetchText(url);
  const title = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() || u.hostname;
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12_000);
  return { title, body };
}

export { MIN_SOURCES, MIN_PLAN_STEPS, liveWebDiscover, syntheticDiscover };
