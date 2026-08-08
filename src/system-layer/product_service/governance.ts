/**
 * Continuance V — AI governance as runtime controls (not SCHEMA_ONLY).
 * Covers: purpose, consent, minimization, disclosure, version, eval,
 * override, fallback, monitoring, rollback.
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ProcessingMode } from '../../local-runtime/types';
import type { SystemCapability } from '../model_registry';
import { evaluateCloudDisclosure } from '../privacy_policy';
import type { ProductRoute } from './types';

export interface GovernanceState {
  schemaVersion: '1.0.0';
  declaredPurpose: string | null;
  userCloudConsent: boolean;
  minimization: {
    stripPiiHints: boolean;
    maxQueryChars: number;
    retainRawQuery: boolean;
  };
  activeModelVersion: string;
  evalBaselineRef: string;
  humanOverride: {
    active: boolean;
    reason: string | null;
    setAt: string | null;
  };
  safeFallbackEnabled: boolean;
  monitoring: {
    enabled: boolean;
    eventCount: number;
    lastEventAt: string | null;
  };
  rollback: {
    snapshots: Array<{
      id: string;
      createdAt: string;
      label: string;
      state: Omit<GovernanceState, 'rollback'>;
    }>;
  };
  updatedAt: string;
}

export interface GovernanceDecision {
  purposeDeclared: boolean;
  purpose: string;
  consentGranted: boolean;
  minimizationApplied: boolean;
  disclosure: string;
  modelVersion: string;
  humanOverrideActive: boolean;
  fallbackSafe: boolean;
  evalBaselineRef: string;
  cloudPermitted: boolean;
  minimizedQuery: string;
  blocked: boolean;
  blockReason: string | null;
}

export interface MonitorEvent {
  id: string;
  at: string;
  kind: string;
  capability?: ProductRoute;
  detail: string;
  ok: boolean;
}

const DEFAULT_PURPOSE =
  'Local gunnchAI product assist for tutoring, code, device, a11y, coaching, network, RAG, science, translation, workflow, security, and continuity.';

function emptyState(modelVersion: string): GovernanceState {
  return {
    schemaVersion: '1.0.0',
    declaredPurpose: DEFAULT_PURPOSE,
    userCloudConsent: false,
    minimization: {
      stripPiiHints: true,
      maxQueryChars: 4000,
      retainRawQuery: false,
    },
    activeModelVersion: modelVersion,
    evalBaselineRef: 'fixtures/system-layer/eval',
    humanOverride: { active: false, reason: null, setAt: null },
    safeFallbackEnabled: true,
    monitoring: { enabled: true, eventCount: 0, lastEventAt: null },
    rollback: { snapshots: [] },
    updatedAt: new Date().toISOString(),
  };
}

function stripPiiHints(text: string): string {
  return text
    .replace(/\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g, '[redacted-email]')
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[redacted-phone]')
    .replace(/\b(?:ssn|social security)\s*[#:]?\s*\d{3}-\d{2}-\d{4}\b/gi, '[redacted-ssn]');
}

export class GovernanceRuntime {
  private state: GovernanceState;
  private readonly storePath: string;
  private readonly events: MonitorEvent[] = [];
  private readonly eventsPath: string;

  constructor(
    cwd = process.cwd(),
    opts?: { modelVersion?: string; storeDir?: string },
  ) {
    const dir =
      opts?.storeDir ?? path.join(cwd, 'var', 'gunnchai', 'governance');
    fs.mkdirSync(dir, { recursive: true });
    this.storePath = path.join(dir, 'state.json');
    this.eventsPath = path.join(dir, 'monitor.jsonl');
    const modelVersion = opts?.modelVersion ?? 'product-service@0.5.0';
    if (fs.existsSync(this.storePath)) {
      this.state = JSON.parse(fs.readFileSync(this.storePath, 'utf8')) as GovernanceState;
    } else {
      this.state = emptyState(modelVersion);
      this.persist();
    }
  }

  getState(): GovernanceState {
    return structuredClone(this.state);
  }

  declarePurpose(purpose: string): GovernanceState {
    this.snapshot('pre-purpose');
    this.state.declaredPurpose = purpose.trim() || DEFAULT_PURPOSE;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    this.record('purpose', `Declared purpose (${this.state.declaredPurpose.length} chars)`, true);
    return this.getState();
  }

  setConsent(userCloudConsent: boolean): GovernanceState {
    this.snapshot('pre-consent');
    this.state.userCloudConsent = userCloudConsent;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    this.record('consent', `userCloudConsent=${userCloudConsent}`, true);
    return this.getState();
  }

  setMinimization(partial: Partial<GovernanceState['minimization']>): GovernanceState {
    this.snapshot('pre-minimization');
    this.state.minimization = { ...this.state.minimization, ...partial };
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    this.record('minimization', JSON.stringify(this.state.minimization), true);
    return this.getState();
  }

  setModelVersion(version: string): GovernanceState {
    this.snapshot('pre-version');
    this.state.activeModelVersion = version;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    this.record('version', version, true);
    return this.getState();
  }

  setHumanOverride(active: boolean, reason?: string): GovernanceState {
    this.snapshot('pre-override');
    this.state.humanOverride = {
      active,
      reason: reason ?? (active ? 'operator override' : null),
      setAt: active ? new Date().toISOString() : null,
    };
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    this.record('override', `active=${active} reason=${this.state.humanOverride.reason}`, true);
    return this.getState();
  }

  setSafeFallback(enabled: boolean): GovernanceState {
    this.state.safeFallbackEnabled = enabled;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    this.record('fallback', `safeFallbackEnabled=${enabled}`, true);
    return this.getState();
  }

  snapshot(label: string): string {
    const { rollback: _r, ...rest } = this.state;
    const id = randomUUID();
    this.state.rollback.snapshots.unshift({
      id,
      createdAt: new Date().toISOString(),
      label,
      state: structuredClone(rest),
    });
    this.state.rollback.snapshots = this.state.rollback.snapshots.slice(0, 20);
    this.state.updatedAt = new Date().toISOString();
    this.persist();
    return id;
  }

  rollback(snapshotId?: string): GovernanceState {
    const snap = snapshotId
      ? this.state.rollback.snapshots.find((s) => s.id === snapshotId)
      : this.state.rollback.snapshots[0];
    if (!snap) {
      throw new Error('ROLLBACK_UNAVAILABLE: no governance snapshot');
    }
    const previousSnapshots = this.state.rollback.snapshots;
    this.state = {
      ...structuredClone(snap.state),
      rollback: { snapshots: previousSnapshots },
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    this.record('rollback', `Restored snapshot ${snap.id} (${snap.label})`, true);
    return this.getState();
  }

  decide(input: {
    capability: ProductRoute;
    query: string;
    purpose?: string;
    processingMode?: ProcessingMode;
    userCloudConsent?: boolean;
    containsSensitiveLocalData?: boolean;
  }): GovernanceDecision {
    const processingMode = input.processingMode ?? 'local-only';
    const consent =
      input.userCloudConsent ?? this.state.userCloudConsent;
    const purpose =
      (input.purpose?.trim() || this.state.declaredPurpose || DEFAULT_PURPOSE).slice(0, 500);

    let minimizedQuery = input.query;
    let minimizationApplied = false;
    if (this.state.minimization.stripPiiHints) {
      const stripped = stripPiiHints(minimizedQuery);
      if (stripped !== minimizedQuery) {
        minimizedQuery = stripped;
        minimizationApplied = true;
      }
    }
    if (minimizedQuery.length > this.state.minimization.maxQueryChars) {
      minimizedQuery = minimizedQuery.slice(0, this.state.minimization.maxQueryChars);
      minimizationApplied = true;
    }

    const mappedCapability: SystemCapability =
      input.capability === 'continuity' ||
      input.capability === 'content_adaptation' ||
      input.capability === 'connection_path'
        ? input.capability === 'connection_path'
          ? 'network'
          : input.capability === 'content_adaptation'
            ? 'translation'
            : 'workflow'
        : input.capability;

    const disclosure = evaluateCloudDisclosure({
      processingMode,
      userCloudConsent: consent,
      containsSensitiveLocalData: Boolean(input.containsSensitiveLocalData),
      capability: mappedCapability,
    });

    let blocked = false;
    let blockReason: string | null = null;
    if (!purpose) {
      blocked = true;
      blockReason = 'PURPOSE_REQUIRED';
    }
    if (this.state.humanOverride.active && /deny|block/i.test(this.state.humanOverride.reason ?? '')) {
      blocked = true;
      blockReason = `HUMAN_OVERRIDE: ${this.state.humanOverride.reason}`;
    }

    return {
      purposeDeclared: Boolean(purpose),
      purpose,
      consentGranted: consent,
      minimizationApplied,
      disclosure: disclosure.userVisibleDisclosure,
      modelVersion: this.state.activeModelVersion,
      humanOverrideActive: this.state.humanOverride.active,
      fallbackSafe: this.state.safeFallbackEnabled,
      evalBaselineRef: this.state.evalBaselineRef,
      cloudPermitted: disclosure.cloudPermitted,
      minimizedQuery,
      blocked,
      blockReason,
    };
  }

  record(
    kind: string,
    detail: string,
    ok: boolean,
    capability?: ProductRoute,
  ): MonitorEvent {
    const event: MonitorEvent = {
      id: randomUUID(),
      at: new Date().toISOString(),
      kind,
      capability,
      detail: detail.slice(0, 500),
      ok,
    };
    this.events.push(event);
    if (this.events.length > 500) this.events.shift();
    if (this.state.monitoring.enabled) {
      this.state.monitoring.eventCount += 1;
      this.state.monitoring.lastEventAt = event.at;
      this.persist();
      fs.appendFileSync(this.eventsPath, `${JSON.stringify(event)}\n`);
    }
    return event;
  }

  recentEvents(limit = 50): MonitorEvent[] {
    return this.events.slice(-limit);
  }

  private persist(): void {
    fs.writeFileSync(this.storePath, JSON.stringify(this.state, null, 2));
  }
}
