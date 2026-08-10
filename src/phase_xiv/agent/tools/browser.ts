/** Permissioned browser tool (local/fixture navigation; no silent cloud). */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { AgentSandbox } from '../sandbox';
import type { LimitTracker } from '../limits';

export interface BrowserPage {
  url: string;
  title: string;
  text: string;
  local: boolean;
}

export class BrowserTool {
  private history: BrowserPage[] = [];

  constructor(
    private readonly sandbox: AgentSandbox,
    private readonly limits: LimitTracker,
    private readonly networkAllowed = false,
  ) {}

  openLocal(relHtml: string): BrowserPage {
    this.limits.recordToolCall();
    const full = this.sandbox.resolve(relHtml);
    const text = fs.readFileSync(full, 'utf8');
    const page: BrowserPage = {
      url: `file://${full}`,
      title: path.basename(relHtml),
      text: text.slice(0, 50_000),
      local: true,
    };
    this.history.push(page);
    return page;
  }

  openRemote(url: string): BrowserPage {
    this.limits.recordToolCall();
    this.sandbox.assertNetwork(this.networkAllowed);
    // Honest local/hybrid: remote requires explicit network; without fetch we mark pending.
    const page: BrowserPage = {
      url,
      title: 'EXTERNAL_PENDING',
      text: 'Remote browser fetch requires explicit network allow + runtime transport.',
      local: false,
    };
    this.history.push(page);
    return page;
  }

  getHistory(): BrowserPage[] {
    return [...this.history];
  }
}
