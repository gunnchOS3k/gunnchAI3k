/**
 * Continuance VI — gunnchOS ai_interface HTTP client.
 *
 * Talks to the local gunnchAI3k product service (127.0.0.1).
 * QEMU guests may host-forward this port; see topology.ts.
 */

import type {
  AssistRequest,
  AssistResponse,
  LocalModelStatus,
  OsDiscoveryPayload,
  PermissionScope,
  ProductRoute,
  RagSourceStatus,
} from '../product_service/types';
import { OS_INTEGRATION_TOKEN, PRODUCT_SERVICE_TOKEN } from '../product_service/types';

export interface AiInterfaceClientOptions {
  baseUrl: string;
  defaultTimeoutMs?: number;
  permissions?: PermissionScope[];
}

export class AiInterfaceClient {
  readonly baseUrl: string;
  readonly defaultTimeoutMs: number;
  readonly permissions?: PermissionScope[];

  constructor(opts: AiInterfaceClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 30_000;
    this.permissions = opts.permissions;
  }

  async health(): Promise<Record<string, unknown>> {
    return this.getJson('/health');
  }

  async discover(): Promise<OsDiscoveryPayload & { ok: boolean }> {
    return this.getJson('/v1/os/discover');
  }

  async modelStatus(): Promise<LocalModelStatus> {
    const body = await this.getJson<{ ok: boolean; modelStatus: LocalModelStatus }>(
      '/v1/os/model-status',
    );
    return body.modelStatus;
  }

  async ragStatus(): Promise<RagSourceStatus> {
    const body = await this.getJson<{ ok: boolean; ragStatus: RagSourceStatus }>(
      '/v1/os/rag-status',
    );
    return body.ragStatus;
  }

  async setConsent(userCloudConsent: boolean): Promise<Record<string, unknown>> {
    return this.postJson('/v1/governance/consent', { userCloudConsent });
  }

  async modelRollback(targetVersion?: string): Promise<Record<string, unknown>> {
    return this.postJson('/v1/governance/model-rollback', { targetVersion });
  }

  async audit(limit = 20): Promise<Record<string, unknown>> {
    return this.getJson(`/v1/audit?limit=${limit}`);
  }

  async cancel(requestId: string): Promise<{ ok: boolean; requestId: string }> {
    return this.postJson('/v1/assist/cancel', { requestId });
  }

  async assist(
    capability: ProductRoute,
    query: string,
    extra?: Partial<AssistRequest> & { signal?: AbortSignal },
  ): Promise<AssistResponse> {
    const body: AssistRequest = {
      capability,
      query,
      permissions: extra?.permissions ?? this.permissions,
      timeoutMs: extra?.timeoutMs ?? this.defaultTimeoutMs,
      ...extra,
    };
    return this.postJson(`/v1/assist/${capability}`, body, extra?.signal, body.timeoutMs);
  }

  /** Mirrors gunnchOS AiInterfaceService.api_tutor_start shape with real product assist. */
  async tutorStart(profile = 'student', topic = 'intro'): Promise<Record<string, unknown>> {
    const assist = await this.assist('tutoring', `WAIKE tutoring for ${profile}: ${topic}`);
    return {
      started: assist.ok,
      profile,
      topic,
      privacy_mode: 'local_only',
      runtime_service: true,
      mock: false,
      requestId: assist.requestId,
      text: assist.text,
      provenance: assist.provenance,
      osIntegrationToken: OS_INTEGRATION_TOKEN,
      productToken: PRODUCT_SERVICE_TOKEN,
    };
  }

  async safetyCheck(response: string): Promise<Record<string, unknown>> {
    const assist = await this.assist('safety_alert', response);
    const blockedPatterns = ['password', 'api_key', 'exploit'];
    const flagged = blockedPatterns.some((p) => response.toLowerCase().includes(p));
    return {
      safe_to_show: assist.ok && !flagged,
      requires_educator_review: flagged,
      mock: false,
      explanation: assist.structured.safetyAlert?.explanation ?? assist.text,
      severity: assist.structured.safetyAlert?.severity ?? 'info',
    };
  }

  private async getJson<T = Record<string, unknown>>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      throw new Error(`AI_INTERFACE_HTTP_${res.status}:${path}`);
    }
    return (await res.json()) as T;
  }

  private async postJson<T = Record<string, unknown>>(
    path: string,
    body: unknown,
    signal?: AbortSignal,
    timeoutMs?: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer =
      timeoutMs && timeoutMs > 0
        ? setTimeout(() => controller.abort('client-timeout'), timeoutMs)
        : undefined;
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return (await res.json()) as T;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
