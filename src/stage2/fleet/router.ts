/**
 * Real multi-model router: task/privacy/context/offline/latency/device/RAM/
 * accelerator/power/cost/preference → selected model, location, reason, fallbacks.
 */

import type { ModelCandidate, ModelLocation, TaskKind } from './roles';
import { ModelFleetRegistry } from './registry';

export type PrivacyClass = 'public' | 'personal' | 'sensitive' | 'device-local';
export type PreferenceHint = 'quality' | 'speed' | 'cost' | 'privacy' | 'balanced';

export interface OsTelemetrySim {
  availableRamMb: number;
  batteryPercent: number;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  accelerator: 'none' | 'gpu' | 'npu' | 'ane';
  offline: boolean;
  powerSave: boolean;
}

export interface RouterInput {
  task: TaskKind;
  privacy: PrivacyClass;
  contextTokens: number;
  offline?: boolean;
  latencyBudgetMs?: number;
  deviceProfile?: string;
  ramMb?: number;
  accelerator?: OsTelemetrySim['accelerator'];
  powerSave?: boolean;
  costSensitive?: boolean;
  preference?: PreferenceHint;
  cloudConsent?: boolean;
  cloudTimeoutMs?: number;
  telemetry?: Partial<OsTelemetrySim>;
  /** Injected failure modes for tests */
  forceFailure?: RouterFailureMode | null;
}

export type RouterFailureMode =
  | 'unavailable'
  | 'ram'
  | 'offline'
  | 'cloud_denied'
  | 'cloud_timeout'
  | 'context_too_large'
  | 'crash'
  | 'low_battery'
  | 'thermal';

export interface RouteResult {
  ok: boolean;
  selectedModelId: string | null;
  selectedRole: ModelCandidate['role'] | null;
  location: ModelLocation;
  reason: string;
  fallbackChain: string[];
  failureMode: RouterFailureMode | null;
  usedTelemetry: OsTelemetrySim;
}

const TASK_ROLE_PREF: Record<TaskKind, ModelCandidate['role'][]> = {
  tutoring: ['LOCAL_FAST', 'LOCAL_PRO', 'NANO_LOCAL', 'OPTIONAL_FRONTIER_CLOUD'],
  code: ['LOCAL_PRO', 'LOCAL_FAST', 'OPTIONAL_FRONTIER_CLOUD', 'NANO_LOCAL'],
  device: ['NANO_LOCAL', 'LOCAL_FAST', 'LOCAL_PRO'],
  research: ['LOCAL_PRO', 'LOCAL_FAST', 'OPTIONAL_FRONTIER_CLOUD', 'NANO_LOCAL'],
  network: ['NANO_LOCAL', 'LOCAL_FAST'],
  archive: ['LOCAL_PRO', 'LOCAL_FAST', 'NANO_LOCAL'],
  summarize: ['LOCAL_FAST', 'LOCAL_PRO', 'NANO_LOCAL', 'OPTIONAL_FRONTIER_CLOUD'],
  translate: ['LOCAL_FAST', 'LOCAL_PRO', 'OPTIONAL_FRONTIER_CLOUD', 'NANO_LOCAL'],
  classify: ['NANO_LOCAL', 'LOCAL_FAST'],
  diagnose: ['LOCAL_FAST', 'LOCAL_PRO', 'NANO_LOCAL'],
  reason: ['LOCAL_PRO', 'LOCAL_FAST', 'OPTIONAL_FRONTIER_CLOUD', 'NANO_LOCAL'],
  search: ['LOCAL_FAST', 'LOCAL_PRO', 'NANO_LOCAL'],
  embed: ['EMBEDDING', 'NANO_LOCAL'],
  rerank: ['RERANKER', 'LOCAL_FAST'],
  vision: ['VISION', 'LOCAL_PRO', 'NANO_LOCAL'],
  speech: ['SPEECH', 'NANO_LOCAL'],
};

function defaultTelemetry(input: RouterInput): OsTelemetrySim {
  return {
    availableRamMb: input.ramMb ?? input.telemetry?.availableRamMb ?? 4096,
    batteryPercent: input.telemetry?.batteryPercent ?? 80,
    thermalState: input.telemetry?.thermalState ?? 'nominal',
    accelerator: input.accelerator ?? input.telemetry?.accelerator ?? 'none',
    offline: input.offline ?? input.telemetry?.offline ?? false,
    powerSave: input.powerSave ?? input.telemetry?.powerSave ?? false,
  };
}

export class ModelRouter {
  constructor(private readonly fleet = new ModelFleetRegistry()) {}

  getFleet(): ModelFleetRegistry {
    return this.fleet;
  }

  route(input: RouterInput): RouteResult {
    const telemetry = defaultTelemetry(input);
    const failure = input.forceFailure ?? null;

    if (failure === 'crash') {
      return this.fail(
        'crash',
        'Simulated engine crash; falling back to nano local if available.',
        telemetry,
        this.nanoFallbackChain(),
      );
    }
    if (failure === 'low_battery' || telemetry.batteryPercent < 10) {
      return this.pickConstrained(
        input,
        telemetry,
        'low_battery',
        'Low battery — preferring NANO_LOCAL only.',
        ['NANO_LOCAL'],
      );
    }
    if (failure === 'thermal' || telemetry.thermalState === 'critical') {
      return this.pickConstrained(
        input,
        telemetry,
        'thermal',
        'Thermal critical — preferring NANO_LOCAL only.',
        ['NANO_LOCAL'],
      );
    }
    if (failure === 'offline' || telemetry.offline) {
      // Force local-only path
      input = { ...input, offline: true, cloudConsent: false };
    }
    if (failure === 'cloud_denied') {
      input = { ...input, cloudConsent: false };
    }
    if (failure === 'cloud_timeout') {
      return this.fail(
        'cloud_timeout',
        'Cloud provider timed out; falling back to local chain.',
        telemetry,
        this.localChainFor(input.task),
      );
    }
    if (failure === 'ram') {
      telemetry.availableRamMb = 128;
      input = { ...input, cloudConsent: false, offline: true };
    }
    if (failure === 'unavailable') {
      for (const c of this.fleet.list()) {
        if (c.role !== 'NANO_LOCAL') this.fleet.markUnavailable(c.id);
      }
    }
    if (failure === 'context_too_large') {
      input = { ...input, contextTokens: 1_000_000 };
    }

    const preference = input.preference ?? 'balanced';
    const roles = [...(TASK_ROLE_PREF[input.task] ?? ['NANO_LOCAL'])];

    if (preference === 'speed' || telemetry.powerSave) {
      roles.sort((a, b) => this.roleSpeedRank(a) - this.roleSpeedRank(b));
    } else if (preference === 'quality') {
      roles.sort((a, b) => this.roleQualityRank(b) - this.roleQualityRank(a));
    } else if (preference === 'privacy' || input.privacy === 'sensitive' || input.privacy === 'device-local') {
      // Strip cloud
      const filtered = roles.filter((r) => r !== 'OPTIONAL_FRONTIER_CLOUD');
      roles.length = 0;
      roles.push(...filtered);
    } else if (preference === 'cost' || input.costSensitive) {
      const filtered = roles.filter((r) => r !== 'OPTIONAL_FRONTIER_CLOUD');
      roles.length = 0;
      roles.push(...filtered, 'NANO_LOCAL');
    }

    const offline = Boolean(input.offline || telemetry.offline);
    const cloudOk =
      !offline &&
      Boolean(input.cloudConsent) &&
      input.privacy !== 'sensitive' &&
      input.privacy !== 'device-local' &&
      failure !== 'cloud_denied' &&
      failure !== 'ram' &&
      telemetry.availableRamMb >= 256;

    const candidates: ModelCandidate[] = [];
    for (const role of roles) {
      for (const model of this.fleet.byRole(role)) {
        if (model.location === 'cloud' && !cloudOk) continue;
        if (!this.fleet.isAvailable(model.id) && failure !== 'unavailable') continue;
        if (!this.fleet.isAvailable(model.id) && model.role !== 'NANO_LOCAL') continue;
        if (model.approxRamMb > telemetry.availableRamMb) continue;
        if (input.contextTokens > model.contextTokens) continue;
        if (model.optional && (role === 'VISION' || role === 'SPEECH')) {
          // optional — include only if explicitly requested task
          if (input.task !== 'vision' && input.task !== 'speech') continue;
        }
        candidates.push(model);
      }
    }

    // Always try nano as last resort if nothing else
    if (candidates.length === 0) {
      const nano = this.fleet.byRole('NANO_LOCAL').find((m) => this.fleet.isAvailable(m.id));
      if (nano && input.contextTokens <= nano.contextTokens && nano.approxRamMb <= telemetry.availableRamMb) {
        candidates.push(nano);
      }
    }

    if (candidates.length === 0) {
      let mode: RouterFailureMode = 'unavailable';
      let reason = 'No eligible model available for constraints.';
      if (input.contextTokens > 2048) {
        mode = 'context_too_large';
        reason = 'Context exceeds all available model windows.';
      } else if (telemetry.availableRamMb < 256) {
        mode = 'ram';
        reason = 'Insufficient RAM for any registered model.';
      } else if (offline && !cloudOk) {
        mode = 'offline';
        reason = 'Offline and no local model fits constraints.';
      }
      return {
        ok: false,
        selectedModelId: null,
        selectedRole: null,
        location: 'unavailable',
        reason,
        fallbackChain: [],
        failureMode: failure ?? mode,
        usedTelemetry: telemetry,
      };
    }

    const selected = candidates[0];
    const fallbackChain = candidates.slice(1).map((c) => c.id);
    // Ensure nano in chain when not selected
    const nanoId = this.fleet.byRole('NANO_LOCAL')[0]?.id;
    if (nanoId && selected.id !== nanoId && !fallbackChain.includes(nanoId)) {
      fallbackChain.push(nanoId);
    }

    return {
      ok: true,
      selectedModelId: selected.id,
      selectedRole: selected.role,
      location: selected.location,
      reason: this.explain(selected, input, telemetry, cloudOk),
      fallbackChain,
      failureMode: failure,
      usedTelemetry: telemetry,
    };
  }

  private explain(
    selected: ModelCandidate,
    input: RouterInput,
    telemetry: OsTelemetrySim,
    cloudOk: boolean,
  ): string {
    return [
      `Selected ${selected.id} (${selected.role}) for task=${input.task}`,
      `privacy=${input.privacy}`,
      `context=${input.contextTokens}`,
      `ram=${telemetry.availableRamMb}MB`,
      `offline=${telemetry.offline}`,
      `cloudOk=${cloudOk}`,
      `preference=${input.preference ?? 'balanced'}`,
      selected.isNanoFallbackOnly ? '[nano-fallback-tier]' : '[primary-tier]',
    ].join('; ');
  }

  private roleSpeedRank(role: ModelCandidate['role']): number {
    const order: ModelCandidate['role'][] = [
      'NANO_LOCAL',
      'EMBEDDING',
      'RERANKER',
      'LOCAL_FAST',
      'SPEECH',
      'VISION',
      'LOCAL_PRO',
      'OPTIONAL_FRONTIER_CLOUD',
    ];
    return order.indexOf(role);
  }

  private roleQualityRank(role: ModelCandidate['role']): number {
    const order: ModelCandidate['role'][] = [
      'NANO_LOCAL',
      'LOCAL_FAST',
      'EMBEDDING',
      'RERANKER',
      'SPEECH',
      'VISION',
      'LOCAL_PRO',
      'OPTIONAL_FRONTIER_CLOUD',
    ];
    return order.indexOf(role);
  }

  private nanoFallbackChain(): string[] {
    return this.fleet.byRole('NANO_LOCAL').map((c) => c.id);
  }

  private localChainFor(task: TaskKind): string[] {
    const ids: string[] = [];
    for (const role of TASK_ROLE_PREF[task] ?? ['NANO_LOCAL']) {
      if (role === 'OPTIONAL_FRONTIER_CLOUD') continue;
      for (const m of this.fleet.byRole(role)) ids.push(m.id);
    }
    return ids;
  }

  private fail(
    mode: RouterFailureMode,
    reason: string,
    telemetry: OsTelemetrySim,
    fallbackChain: string[],
  ): RouteResult {
    const nano = this.fleet.byRole('NANO_LOCAL').find((m) => this.fleet.isAvailable(m.id));
    if (nano && (mode === 'crash' || mode === 'cloud_timeout')) {
      return {
        ok: true,
        selectedModelId: nano.id,
        selectedRole: nano.role,
        location: 'local',
        reason,
        fallbackChain: fallbackChain.filter((id) => id !== nano.id),
        failureMode: mode,
        usedTelemetry: telemetry,
      };
    }
    return {
      ok: false,
      selectedModelId: null,
      selectedRole: null,
      location: 'unavailable',
      reason,
      fallbackChain,
      failureMode: mode,
      usedTelemetry: telemetry,
    };
  }

  private pickConstrained(
    input: RouterInput,
    telemetry: OsTelemetrySim,
    mode: RouterFailureMode,
    reason: string,
    roles: ModelCandidate['role'][],
  ): RouteResult {
    for (const role of roles) {
      for (const m of this.fleet.byRole(role)) {
        if (!this.fleet.isAvailable(m.id)) continue;
        if (m.approxRamMb > telemetry.availableRamMb) continue;
        if (input.contextTokens > m.contextTokens) continue;
        return {
          ok: true,
          selectedModelId: m.id,
          selectedRole: m.role,
          location: m.location,
          reason,
          fallbackChain: [],
          failureMode: mode,
          usedTelemetry: telemetry,
        };
      }
    }
    return {
      ok: false,
      selectedModelId: null,
      selectedRole: null,
      location: 'unavailable',
      reason: `${reason} No constrained model available.`,
      fallbackChain: [],
      failureMode: mode,
      usedTelemetry: telemetry,
    };
  }
}
