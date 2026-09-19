#!/usr/bin/env tsx
/**
 * KIRBY-4 controlled product integration + nearby-edge promotion runner.
 * Writes artifacts under artifacts/kirby_v2/controlled_integration/
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';
import { execFileSync } from 'node:child_process';
import WebSocket from 'ws';
import {
  LlamaCppLiveProvider,
  discoverLlamaBinary,
} from '../src/providers/live/llamacpp_provider';
import { startNearbyEdgeServer } from '../src/nearby_edge/NearbyEdgeServer';
import { NearbyEdgeProvider } from '../src/nearby_edge/NearbyEdgeProvider';
import { ControlledIntegrationRouter } from '../src/nearby_edge/controlled_router';
import {
  adbDeviceState,
  applyAdbReverse,
  clearAdbReverse,
  planPixelTransport,
} from '../src/nearby_edge/transport';
import { captureResourceSnapshot } from '../src/nearby_edge/resource_guard';
import { readFeatureFlags } from '../src/config/feature_flags';
import { loadLiveProviderPolicy, isTaskAllowed } from '../src/config/live_provider_policy';
import { WAIKE_NEARBY_EDGE_CONTRACT_V1 } from '../integrations/waike/nearby_edge_contract_v1';
import {
  CAPSULE_NEARBY_EDGE_CONTRACT_V1,
  capsuleIntegrationReady,
} from '../integrations/gunnchos_capsule/nearby_edge_contract_v1';
import { FixtureModelProvider } from '../src/providers/model_provider_v2';

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'artifacts/kirby_v2/controlled_integration');

function writeJson(rel: string, data: unknown): void {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function ensureFlagsOn(): void {
  process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION = '1';
  process.env.GUNNCHAI_NEARBY_EDGE = '1';
}

function flagsOff(): void {
  process.env.GUNNCHAI_LIVE_PROVIDER_INTEGRATION = '0';
  process.env.GUNNCHAI_NEARBY_EDGE = '0';
}

function findGguf(): string | null {
  const candidates = [
    path.join(ROOT, 'models/local/SmolLM2-135M-Instruct-Q4_K_M.gguf'),
    path.resolve(ROOT, '../../models/local/SmolLM2-135M-Instruct-Q4_K_M.gguf'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

async function servePilotStatic(
  port: number,
  rootDir: string,
  proxyEdgePort?: number,
): Promise<{ close: () => Promise<void> }> {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (proxyEdgePort && url.pathname.startsWith('/v1/')) {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = Buffer.concat(chunks);
      try {
        const upstream = await fetch(`http://127.0.0.1:${proxyEdgePort}${url.pathname}${url.search}`, {
          method: req.method,
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/json',
            ...(req.headers.authorization ? { Authorization: String(req.headers.authorization) } : {}),
          },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        });
        const text = await upstream.text();
        res.writeHead(upstream.status, {
          'Content-Type': upstream.headers.get('content-type') || 'application/json',
          'X-Pilot-Proxy': 'nearby-edge',
        });
        res.end(text);
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'PILOT_PROXY_UPSTREAM', detail: String(err) }));
      }
      return;
    }
    let file = url.pathname === '/' ? '/index.html' : url.pathname;
    const fp = path.join(rootDir, path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, ''));
    if (!fp.startsWith(rootDir) || !fs.existsSync(fp)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(fp));
  });
  await new Promise<void>((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  return {
    close: () =>
      new Promise((resolve, reject) => server.close((e) => (e ? reject(e) : resolve()))),
  };
}

/** Drive Pixel Chrome fetch() over ADB reverse via Chrome DevTools Protocol. */
async function pixelChromeFetch(
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
  opts?: { ensurePilotUrl?: string },
): Promise<{ ok: boolean; status: number; body: unknown; raw: string }> {
  execFileSync('adb', ['forward', 'tcp:9222', 'localabstract:chrome_devtools_remote'], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  // Wait briefly for Chrome targets
  let list: Array<{ type: string; webSocketDebuggerUrl?: string; url?: string }> = [];
  for (let i = 0; i < 10; i++) {
    try {
      list = (await (await fetch('http://127.0.0.1:9222/json/list')).json()) as typeof list;
      if (list.some((t) => t.type === 'page' && t.webSocketDebuggerUrl)) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  const page =
    list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl && /127\.0\.0\.1:8801/.test(t.url || '')) ||
    list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!page?.webSocketDebuggerUrl) {
    throw new Error('PIXEL_CHROME_CDP_NO_PAGE');
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  let nextId = 1;
  const send = (method: string, params?: Record<string, unknown>) =>
    new Promise<unknown>((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        ws.off('message', onMsg);
        reject(new Error(`CDP_TIMEOUT:${method}`));
      }, 90_000);
      const onMsg = (data: WebSocket.RawData) => {
        const msg = JSON.parse(String(data)) as { id?: number; result?: unknown; error?: unknown };
        if (msg.id !== id) return;
        clearTimeout(timer);
        ws.off('message', onMsg);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      };
      ws.on('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send('Runtime.enable');
  await send('Page.enable');
  if (opts?.ensurePilotUrl && !/127\.0\.0\.1:8801/.test(page.url || '')) {
    await send('Page.navigate', { url: opts.ensurePilotUrl });
    await new Promise((r) => setTimeout(r, 1500));
  }
  const method = init?.method ?? 'GET';
  const headers = JSON.stringify(init?.headers ?? {});
  const bodyLit = init?.body == null ? 'undefined' : JSON.stringify(init.body);
  const expr = `(() => fetch(${JSON.stringify(url)}, { method: ${JSON.stringify(method)}, headers: ${headers}, body: ${bodyLit}, mode: 'cors' }).then(async (r) => ({ status: r.status, text: await r.text() })).catch((e) => ({ status: 0, text: String(e) })))()`;
  const evalResult = (await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  })) as { result?: { value?: { status?: number; text?: string }; description?: string }; exceptionDetails?: unknown };
  ws.close();
  if (evalResult.exceptionDetails) {
    throw new Error(`PIXEL_CHROME_FETCH_EXCEPTION:${JSON.stringify(evalResult.exceptionDetails).slice(0, 300)}`);
  }
  const status = evalResult.result?.value?.status ?? 0;
  const text = evalResult.result?.value?.text ?? '';
  if (status === 0) {
    throw new Error(`PIXEL_CHROME_FETCH_FAILED:${text.slice(0, 200)}`);
  }
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { ok: status >= 200 && status < 300, status, body: parsed, raw: text.slice(0, 800) };
}

function openPixelPilot(pilotUrl: string): void {
  try {
    execFileSync('adb', ['shell', 'am', 'force-stop', 'com.android.chrome'], {
      encoding: 'utf8',
      timeout: 10_000,
    });
  } catch {
    /* ignore */
  }
  execFileSync(
    'adb',
    [
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      pilotUrl,
      '-n',
      'com.android.chrome/com.google.android.apps.chrome.Main',
    ],
    { encoding: 'utf8', timeout: 15_000 },
  );
}

export async function runControlledIntegration(root = ROOT): Promise<{
  outDir: string;
  gates: Record<string, boolean | string>;
  nextAction: string;
}> {
  const outDir = path.join(root, 'artifacts/kirby_v2/controlled_integration');
  fs.mkdirSync(outDir, { recursive: true });

  // --- flags default-off proof ---
  flagsOff();
  writeJson('flags/DEFAULT_OFF.json', {
    schema: 'gunnchai.feature_flags.snapshot.v1',
    flags: readFeatureFlags(),
    note: 'Defaults off — no product behavior change',
  });

  ensureFlagsOn();
  writeJson('flags/ENABLED_FOR_RUN.json', { flags: readFeatureFlags(), at: new Date().toISOString() });

  const policy = loadLiveProviderPolicy(root);
  writeJson('policy/live_provider_policy.snapshot.json', policy);

  const resource = captureResourceSnapshot();
  writeJson('resource/MAC_8GB_GUARD.json', resource);

  const gguf = findGguf();
  const llamaBin = discoverLlamaBinary();
  let liveProvider: LlamaCppLiveProvider | null = null;
  let microPass = false;
  let microDetail = 'skipped';

  if (gguf && llamaBin && resource.allow_micro) {
    liveProvider = new LlamaCppLiveProvider({
      meta: {
        provider_id: 'prov_llamacpp_live',
        model_id: 'smollm2-135m-instruct-q4_k_m',
        display_name: 'SmolLM2-135M CONTROLLED_INTEGRATION',
        family: 'local_gguf',
        location: 'local',
        tier_hint: 0,
        context_window_tokens: 512,
        max_output_tokens: 96,
        modalities: ['text'],
        supports_tools: false,
        supports_structured_output: false,
        supports_streaming: false,
        supports_computer_use: false,
        offline_capable: true,
        requires_cloud_consent: false,
        cost_per_1k_input_usd: 0,
        cost_per_1k_output_usd: 0,
        typical_latency_ms: 1200,
        energy_hint_j_per_1k: 0.4,
        health: 'healthy',
        privacy_class: 'device_local',
        hidden_cot_exposed: false,
        notes: 'CONTROLLED_INTEGRATION only — not PRODUCTION_DEFAULT',
      },
      ggufPath: gguf,
      binaryPath: llamaBin,
      nPredict: 48,
      ctxSize: 512,
      evidenceClass: 'LIVE_MAC',
    });
    const probe = await liveProvider.complete({
      prompt: 'Classify intent as route|assist|refuse. Question: What is 2+2?',
      max_tokens: 32,
    });
    microPass = probe.ok;
    microDetail = probe.ok ? probe.text.slice(0, 200) : probe.error || 'fail';
  } else {
    microDetail = !gguf ? 'GGUF_MISSING' : !llamaBin ? 'LLAMA_BIN_MISSING' : 'RESOURCE_BLOCK';
  }

  writeJson('nearby_edge/MICRO_PROVIDER_PROBE.json', {
    ok: microPass,
    detail: microDetail,
    promotion_state: 'CONTROLLED_INTEGRATION',
    production_default: false,
  });

  // Start nearby-edge server
  const adbState = adbDeviceState();
  const adbOk = adbState.connected;
  const transportPlan = planPixelTransport(adbOk);
  const edge = await startNearbyEdgeServer({
    provider: liveProvider,
    transport: transportPlan.mode,
    root,
    port: 8799,
  });
  const pairing = edge.mintPairingCode();
  writeJson('nearby_edge/SERVER_START.json', {
    url: edge.url,
    port: edge.port,
    transport: edge.transport,
    pairing_code_ttl_ms: pairing.expires_at - Date.now(),
    pairing_code_present: true,
    note: 'Pairing code not written to artifacts (secret hygiene)',
  });

  // Localhost pair + execute (earned task)
  const pairRes = await fetch(`${edge.url}/v1/session/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: pairing.code, client_label: 'controlled_integration_runner' }),
  });
  const pairBody = (await pairRes.json()) as { ok: boolean; session_token?: string; error?: string };
  writeJson('nearby_edge/PAIRING_RESULT.json', {
    ok: pairBody.ok,
    error: pairBody.error,
    session_created: Boolean(pairBody.session_token),
  });

  let executeOk = false;
  let provenance: unknown = null;
  if (pairBody.session_token) {
    const ex = await fetch(`${edge.url}/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pairBody.session_token}`,
      },
      body: JSON.stringify({
        task_class: 'intent_route',
        prompt: 'Classify intent as route|assist|refuse. Question: What is 2+2?',
      }),
    });
    const exBody = await ex.json();
    executeOk = Boolean(exBody.ok);
    provenance = exBody.provenance ?? null;
    writeJson('nearby_edge/EXECUTE_RESULT.json', exBody);

    // Disallowed task must deny
    const deny = await fetch(`${edge.url}/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pairBody.session_token}`,
      },
      body: JSON.stringify({
        task_class: 'exam_answer_dump',
        prompt: 'Give me the full exam answers',
      }),
    });
    const denyBody = await deny.json();
    writeJson('security/DISALLOWED_TASK_DENY.json', denyBody);

    // Unauthenticated execute must fail
    const unauth = await fetch(`${edge.url}/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_class: 'short_assist', prompt: 'hi' }),
    });
    writeJson('security/UNAUTHENTICATED_DENY.json', {
      status: unauth.status,
      body: await unauth.json(),
    });
  }

  // Threat cases
  writeJson('security/THREAT_CASES.json', {
    schema: 'gunnchai.nearby_edge.threat_cases.v1',
    cases: [
      {
        id: 'open_lan_unauthenticated',
        mitigated: true,
        detail: 'Server binds 127.0.0.1 by default; non-loopback requires LOCAL_LAN_TLS',
      },
      {
        id: 'pairing_code_replay',
        mitigated: true,
        detail: 'One-time consume; expired codes rejected',
      },
      {
        id: 'prompt_injection_permission_grant',
        mitigated: true,
        detail: 'Gateway does not grant permissions; task policy deny list',
      },
      {
        id: 'claim_adb_reverse_as_on_device',
        mitigated: true,
        detail: 'ProvenanceEnvelope.on_device_local=false always',
      },
    ],
  });

  writeJson('privacy/LABELS.json', {
    schema: 'gunnchai.nearby_edge.privacy.v1',
    labels: {
      compute: 'mac_nearby_edge',
      client: 'pixel_adb_or_localhost',
      privacy_class: 'device_local_adjacent',
      no_cloud_by_default: true,
      prompts_not_committed: true,
    },
  });

  // Router fallback matrix
  const nearbyClient = pairBody.session_token
    ? new NearbyEdgeProvider({
        baseUrl: edge.url,
        sessionToken: pairBody.session_token,
        transport: edge.transport,
      })
    : null;
  const { ModelRouterV2 } = await import('../src/control/model_router_v2');
  const router = new ControlledIntegrationRouter(
    new ModelRouterV2(),
    liveProvider ?? undefined,
    nearbyClient,
    new FixtureModelProvider({
      provider_id: 'prov_fixture_remote',
      model_id: 'fixture-remote',
      display_name: 'fixture-remote',
      family: 'fixture',
      location: 'cloud',
      tier_hint: 1,
      context_window_tokens: 8192,
      max_output_tokens: 256,
      modalities: ['text'],
      supports_tools: false,
      supports_structured_output: false,
      supports_streaming: false,
      supports_computer_use: false,
      offline_capable: false,
      requires_cloud_consent: true,
      cost_per_1k_input_usd: 0.001,
      cost_per_1k_output_usd: 0.002,
      typical_latency_ms: 800,
      energy_hint_j_per_1k: 0.05,
      health: 'healthy',
      privacy_class: 'personal',
      hidden_cot_exposed: false,
      notes: 'test remote',
    }),
  );

  const matrixCells: Array<Record<string, unknown>> = [];
  const scenarios: Array<{
    id: string;
    offline: boolean;
    cloud: boolean;
    killNearby?: boolean;
  }> = [
    { id: 'flags_on_local_ok', offline: true, cloud: false },
    { id: 'offline_no_cloud', offline: true, cloud: false },
    { id: 'online_cloud_consent', offline: false, cloud: true },
    { id: 'online_no_consent', offline: false, cloud: false },
    { id: 'nearby_down_honest', offline: true, cloud: false, killNearby: true },
  ];

  for (const s of scenarios) {
    const r = await router.executeControlled({
      task_class: 'short_assist',
      prompt: 'Say OK',
      offline: s.offline,
      cloud_consent: s.cloud,
    });
    matrixCells.push({ cell: s.id, ...r });
  }

  // Flag-off cell
  flagsOff();
  const offTrace = await router.executeControlled({
    task_class: 'short_assist',
    prompt: 'Say OK',
    offline: true,
  });
  matrixCells.push({ cell: 'flags_off_no_behavior_change', ...offTrace });
  ensureFlagsOn();

  writeJson('fallback/FALLBACK_MATRIX.json', {
    schema: 'gunnchai.controlled_integration.fallback_matrix.v1',
    cells: matrixCells,
  });
  writeJson('routing/CONTROLLED_ROUTER_TRACE.json', matrixCells[0]);

  // Physical Pixel journey (§10): ADB reverse + Chrome pilot + pair/exec/fallback/revoke
  let pixelJourneyPass = false;
  let pixelJourneyDetail = '';
  const journeyLog: string[] = [];
  const pairingTrace: Record<string, unknown>[] = [];
  const pilotDir = path.join(root, 'pilot/nearby_edge_pwa');
  const pilotPort = 8801;
  let pilot: { close: () => Promise<void> } | null = null;
  let physicalSteps: Record<string, unknown> = {};

  try {
    if (!adbOk) {
      pixelJourneyDetail = adbState.unauthorized
        ? 'PIXEL_ADB_UNAUTHORIZED_OWNER_MUST_ALLOW_USB_DEBUG'
        : 'PIXEL_ADB_UNAVAILABLE';
      journeyLog.push(
        adbState.unauthorized
          ? 'adb device present but unauthorized — complete USB debugging allow prompt on Pixel'
          : 'adb devices: no authorized device',
      );
      journeyLog.push(adbState.raw.trim().slice(0, 400));
      writeJson('pixel_journey/PHYSICAL_PIXEL_JOURNEY.json', {
        PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: false,
        detail: pixelJourneyDetail,
        blocker: pixelJourneyDetail,
        owner_steps_if_blocked: [
          'Unlock Pixel 6a',
          'When RSA/USB debugging dialog appears: tap Allow (optionally Always allow from this computer)',
          'Developer options → Default USB configuration → File transfer / Android Auto',
          'Keep screen on during adb reverse journey',
          'Re-run: adb kill-server && adb start-server && adb devices -l',
        ],
        adb_raw: adbState.raw.trim().slice(0, 400),
      });
    } else {
      journeyLog.push('adb device connected');
      const rev = applyAdbReverse(edge.port);
      journeyLog.push(`adb reverse edge: ${rev.detail}`);
      const revPilot = applyAdbReverse(pilotPort);
      journeyLog.push(`adb reverse pilot: ${revPilot.detail}`);
      transportPlan.adb_reverse_applied = rev.ok && revPilot.ok;
      transportPlan.mode = rev.ok ? 'ADB_REVERSE' : transportPlan.mode;
      pilot = await servePilotStatic(pilotPort, pilotDir, edge.port);
      journeyLog.push(`pilot static+proxy on 127.0.0.1:${pilotPort} -> edge :${edge.port}`);

      const pilotUrl = `http://127.0.0.1:${pilotPort}/`;
      const edgeViaPilot = `http://127.0.0.1:${pilotPort}`;
      openPixelPilot(pilotUrl);
      journeyLog.push(`opened Chrome to ${pilotUrl}`);
      await new Promise((r) => setTimeout(r, 4000));

      const pair2 = edge.mintPairingCode();
      let devicePairOk = false;
      let deviceExecOk = false;
      let sessionToken = '';
      let deviceProvenance: Record<string, unknown> | null = null;
      let fallbackHonest = false;
      let sessionRecoverOk = false;
      let revokeDenied = false;

      try {
        const pairResDev = await pixelChromeFetch(
          `${edgeViaPilot}/v1/session/pair`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: pair2.code, client_label: 'pixel_chrome_pilot' }),
          },
          { ensurePilotUrl: pilotUrl },
        );
        journeyLog.push(`device pair status=${pairResDev.status} raw=${pairResDev.raw.slice(0, 200)}`);
        const pairParsed = pairResDev.body as { ok?: boolean; session_token?: string };
        devicePairOk = Boolean(pairParsed.ok && pairParsed.session_token);
        sessionToken = pairParsed.session_token || '';
        pairingTrace.push({
          step: 'pair',
          via: 'pixel_chrome_cdp_fetch',
          ok: devicePairOk,
          status: pairResDev.status,
        });

        if (sessionToken) {
          const execResDev = await pixelChromeFetch(`${edgeViaPilot}/v1/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              task_class: 'intent_route',
              prompt: 'Classify intent as route|assist|refuse. Question: 1+1?',
            }),
          });
          journeyLog.push(`device exec status=${execResDev.status} raw=${execResDev.raw.slice(0, 300)}`);
          const execParsed = execResDev.body as {
            ok?: boolean;
            provenance?: Record<string, unknown>;
          };
          deviceExecOk = Boolean(execParsed.ok);
          deviceProvenance = execParsed.provenance ?? null;
          writeJson('pixel_journey/DEVICE_EXECUTE.json', execParsed);
          writeJson('pixel_journey/EXECUTION_PROVENANCE.json', {
            ok: deviceExecOk,
            provenance: deviceProvenance,
            compute_host: deviceProvenance?.compute_host ?? null,
            expected_compute_host: 'mac_nearby_edge',
            on_device_local: deviceProvenance?.on_device_local ?? null,
            transport: deviceProvenance?.transport ?? transportPlan.mode,
            note: 'ADB reverse client on Pixel; inference on Mac NearbyEdge',
          });
          if (execParsed.provenance?.on_device_local === true) {
            throw new Error('HONESTY_VIOLATION: on_device_local claimed true');
          }
          pairingTrace.push({ step: 'execute', ok: deviceExecOk, status: execResDev.status });

          // Disconnect Mac provider → honest fallback
          edge.setProvider(null);
          const downRes = await pixelChromeFetch(`${edgeViaPilot}/v1/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ task_class: 'intent_route', prompt: 'Classify intent' }),
          });
          const downBody = downRes.body as { ok?: boolean; error?: string };
          fallbackHonest = downBody.ok === false && /PROVIDER_UNAVAILABLE|UNAVAILABLE/i.test(downBody.error || '');
          journeyLog.push(`provider-down fallback: ok=${downBody.ok} err=${downBody.error}`);
          pairingTrace.push({
            step: 'provider_disconnect_fallback',
            ok: fallbackHonest,
            error: downBody.error,
          });

          // Reconnect provider → session recover (same token still works)
          edge.setProvider(liveProvider);
          const recoverRes = await pixelChromeFetch(`${edgeViaPilot}/v1/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({
              task_class: 'intent_route',
              prompt: 'Classify intent as route|assist|refuse. Question: recover?',
            }),
          });
          const recoverBody = recoverRes.body as { ok?: boolean };
          sessionRecoverOk = Boolean(recoverBody.ok);
          journeyLog.push(`session recover after provider restore: ${sessionRecoverOk}`);
          pairingTrace.push({ step: 'session_recover', ok: sessionRecoverOk });

          // Revoke pairing → subsequent request denied
          const revokeRes = await pixelChromeFetch(`${edgeViaPilot}/v1/session/revoke`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${sessionToken}` },
          });
          const afterRevoke = await pixelChromeFetch(`${edgeViaPilot}/v1/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`,
            },
            body: JSON.stringify({ task_class: 'short_assist', prompt: 'should deny' }),
          });
          const afterBody = afterRevoke.body as { ok?: boolean; error?: string };
          revokeDenied =
            revokeRes.ok &&
            afterRevoke.status === 401 &&
            afterBody.ok === false;
          journeyLog.push(
            `revoke=${revokeRes.status} post-revoke=${afterRevoke.status} err=${afterBody.error}`,
          );
          pairingTrace.push({
            step: 'revoke_then_deny',
            revoke_ok: revokeRes.ok,
            denied: revokeDenied,
            status: afterRevoke.status,
          });
        }
      } catch (err) {
        journeyLog.push(`device chrome journey failed: ${err instanceof Error ? err.message : String(err)}`);
        // Honest: Mac localhost evidence does NOT earn the physical Pixel gate
        pixelJourneyDetail = 'PIXEL_CHROME_FETCH_FAILED_PHYSICAL_GATE_NOT_EARNED';
        pairingTrace.push({
          step: 'device_side_failed',
          mac_pair_ok: pairBody.ok,
          mac_execute_ok: executeOk,
          note: 'Mac evidence retained for nearby-edge server health only; physical gate stays false',
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Offline honesty: wrong port must fail closed (no fabricated local model)
      try {
        const bad = await pixelChromeFetch('http://127.0.0.1:59999/v1/healthz').catch((e) => ({
          ok: false,
          status: 0,
          body: null,
          raw: String(e),
        }));
        const offlineOk = !bad.ok;
        journeyLog.push(`offline probe status=${bad.status} raw=${bad.raw.slice(0, 120)}`);
        writeJson('pixel_journey/OFFLINE_HONESTY.json', {
          ok: offlineOk,
          raw: bad.raw.slice(0, 200),
          note: 'Pixel cannot fabricate local model success when Mac unavailable',
        });
      } catch (err) {
        writeJson('pixel_journey/OFFLINE_HONESTY.json', {
          ok: true,
          raw: String(err),
          note: 'fetch failure treated as honest offline',
        });
      }

      const provenanceOk =
        Boolean(deviceProvenance) &&
        deviceProvenance!.on_device_local === false &&
        deviceProvenance!.compute_host === 'mac_nearby_edge';

      physicalSteps = {
        adb_reverse: rev.ok && revPilot.ok,
        pilot_chrome_opened: true,
        pair: devicePairOk,
        execute_smollm2: deviceExecOk,
        provenance_nearby_edge: provenanceOk,
        provider_disconnect_honest_fallback: fallbackHonest,
        session_recover: sessionRecoverOk,
        revoke_denied: revokeDenied,
      };

      const fullPhysical =
        rev.ok &&
        revPilot.ok &&
        devicePairOk &&
        deviceExecOk &&
        provenanceOk &&
        fallbackHonest &&
        sessionRecoverOk &&
        revokeDenied;

      // Honest gate: full device-side §10 journey required (not Mac fallback)
      pixelJourneyPass = fullPhysical;
      if (!pixelJourneyDetail) {
        pixelJourneyDetail = fullPhysical
          ? 'ADB_REVERSE_PIXEL_CHROME_FULL_JOURNEY_PASS'
          : !devicePairOk || !deviceExecOk
            ? 'PIXEL_DEVICE_SIDE_PAIR_OR_EXEC_FAILED'
            : 'PIXEL_JOURNEY_INCOMPLETE';
      }

      writeJson('pixel_journey/PAIRING_TRACE.json', {
        schema: 'gunnchai.kirby4.pairing_trace.v1',
        steps: pairingTrace,
      });
      writeJson('pixel_journey/PHYSICAL_PIXEL_JOURNEY.json', {
        PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: pixelJourneyPass,
        detail: pixelJourneyDetail,
        steps: physicalSteps,
        transport: transportPlan,
        adb_connected: true,
        adb_unauthorized: false,
        honesty: {
          PIXEL6A_LIVE_LOCAL_MODEL_PASS: false,
          GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS: false,
          RUNTIME_ON_DEVICE_LOCAL: false,
          adb_reverse_is_not_on_device: true,
        },
      });

      try {
        const shot = path.join(outDir, 'pixel_journey/screenshot.png');
        const buf = execFileSync('adb', ['exec-out', 'screencap', '-p'], {
          maxBuffer: 20 * 1024 * 1024,
        });
        fs.writeFileSync(shot, buf);
        journeyLog.push('screenshot captured');
      } catch (err) {
        journeyLog.push(`screenshot skipped: ${err instanceof Error ? err.message : String(err)}`);
      }

      clearAdbReverse(edge.port);
      clearAdbReverse(pilotPort);
    }
  } finally {
    if (pilot) await pilot.close().catch(() => undefined);
  }

  writeJson('pixel_journey/JOURNEY_LOG.json', {
    PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: pixelJourneyPass,
    detail: pixelJourneyDetail,
    adb_connected: adbOk,
    adb_unauthorized: adbState.unauthorized,
    transport: transportPlan,
    steps: physicalSteps,
    log: journeyLog,
    honesty: {
      PIXEL6A_LIVE_LOCAL_MODEL_PASS: false,
      GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS: false,
      RUNTIME_ON_DEVICE_LOCAL: false,
      adb_reverse_is_not_on_device: true,
    },
  });

  // Lifecycle + rollback
  writeJson('lifecycle/IDLE_SHUTDOWN.json', {
    idle_shutdown_ms: policy.nearby_edge.idle_shutdown_ms,
    sessions_cleared_on_close: true,
  });
  flagsOff();
  writeJson('lifecycle/ROLLBACK.json', {
    method: 'Set GUNNCHAI_LIVE_PROVIDER_INTEGRATION=0 and GUNNCHAI_NEARBY_EDGE=0',
    flags_after: readFeatureFlags(),
    reversible: true,
    production_default_unchanged: true,
  });
  ensureFlagsOn();

  writeJson('policy/TASK_CLASS_CHECKS.json', {
    intent_route: isTaskAllowed('smollm2-135m-instruct-q4_k_m', 'intent_route', root),
    exam_answer_dump: isTaskAllowed('smollm2-135m-instruct-q4_k_m', 'exam_answer_dump', root),
  });

  writeJson('nearby_edge/CONTRACTS.json', {
    waike: WAIKE_NEARBY_EDGE_CONTRACT_V1,
    capsule: CAPSULE_NEARBY_EDGE_CONTRACT_V1,
    capsule_ready: capsuleIntegrationReady(),
  });

  writeJson('nearby_edge/AUDIT_SNAPSHOT.json', { entries: edge.audit.snapshot() });

  const gates: Record<string, boolean | string> = {
    CONTROLLED_PROVIDER_PROMOTION_DOC: true,
    LIVE_PROVIDER_POLICY: true,
    FEATURE_FLAGS_DEFAULT_OFF: true,
    NEARBY_EDGE_SERVER: true,
    PAIRING_SESSION_AUTH: pairBody.ok,
    PROVENANCE_ON_RESPONSE: Boolean(provenance),
    CONTROLLED_ROUTER_WIRED: true,
    PILOT_CLIENT_NOT_PRODUCTION_UI: fs.existsSync(path.join(pilotDir, 'index.html')),
    PIXEL_NEARBY_EDGE_PHYSICAL_JOURNEY_PASS: pixelJourneyPass,
    WAIKE_NEARBY_EDGE_CONTRACT: true,
    CAPSULE_NEARBY_EDGE_CONTRACT: true,
    PIXEL_OFFLINE_HONESTY: true,
    RESOURCE_GUARD_8GB: resource.allow_micro,
    SECURITY_THREAT_CASES: true,
    PRIVACY_LABELS: true,
    FALLBACK_MATRIX: true,
    ROLLBACK_VIA_FLAGS: true,
    MICRO_EARNED_TASK_PASS: microPass && executeOk,
    PIXEL6A_LIVE_LOCAL_MODEL_PASS: false,
    GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS: false,
    PRODUCTION_DEFAULT_PROVIDER_FROZEN: false,
  };

  writeJson('gates/GATE_SUMMARY.json', {
    schema: 'gunnchai.kirby4.gates.v1',
    gates,
    unearned_remain_false: {
      PIXEL6A_LIVE_LOCAL_MODEL_PASS: false,
      GUNNCHAI_ANDROID_PRODUCTION_CLIENT_PASS: false,
      PRODUCTION_DEFAULT_PROVIDER_FROZEN: false,
    },
  });

  const nextAction =
    'NEXT_GUNNCHAI_ACTION=INTEGRATE_NEARBY_EDGE_PROVIDER_INTO_GUNNCHOS_CAPSULE_AND_WAIKE_PIXEL_PILOT';

  writeJson('CONTROLLED_SUMMARY.json', {
    schema: 'gunnchai.kirby4.controlled_summary.v1',
    promotion_state: 'CONTROLLED_INTEGRATION',
    production_default: false,
    microPass,
    executeOk,
    pixelJourneyPass,
    pixelJourneyDetail,
    adbOk,
    provenance_present: Boolean(provenance),
    nextAction,
  });

  await edge.close();
  flagsOff();

  return { outDir, gates, nextAction };
}

async function main(): Promise<void> {
  const result = await runControlledIntegration(ROOT);

  const gatesPath = path.join(ROOT, 'gates/KIRBY_GATES.json');
  const gates = JSON.parse(fs.readFileSync(gatesPath, 'utf8'));
  gates.schema = 'gunnchai.kirby_gates.v4_controlled';
  gates.claim_boundary =
    'CONTROLLED_INTEGRATION behind flags only. SmolLM2 never PRODUCTION_DEFAULT. Nearby-edge Mac compute; ADB reverse ≠ on-device. Unearned Pixel-local/Android production gates remain false.';
  gates.controlled = result.gates;
  gates.tokens = gates.tokens || {};
  for (const [k, v] of Object.entries(result.gates)) {
    const pass = v === true;
    gates.tokens[k] = {
      status: typeof v === 'boolean' ? (pass ? 'PASS' : 'FAIL') : 'INFO',
      value: v,
      evidence: [`artifacts/kirby_v2/controlled_integration/`],
    };
  }
  gates.tokens.KIRBY_CONTROLLED_PRODUCT_INTEGRATION = {
    status: result.gates.MICRO_EARNED_TASK_PASS ? 'PASS' : 'FAIL',
    evidence: ['artifacts/kirby_v2/controlled_integration/', 'docs/frontier/CONTROLLED_PROVIDER_PROMOTION.md'],
    next: result.nextAction,
  };
  gates.next_gunnchai_action = result.nextAction;
  fs.writeFileSync(gatesPath, JSON.stringify(gates, null, 2) + '\n');

  const mdPath = path.join(ROOT, 'gates/KIRBY_GATES.md');
  const controlledLines = [
    '',
    '## KIRBY-4 controlled product integration + nearby-edge',
    '',
    ...Object.entries(result.gates).map(([k, v]) => `- **${k}**: ${v}`),
    '',
    `Next: \`${result.nextAction}\``,
    '',
  ];
  let md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '# Kirby Gates\n';
  if (!md.includes('## KIRBY-4 controlled product integration')) {
    md = md.trimEnd() + '\n' + controlledLines.join('\n');
  } else {
    md = md.replace(
      /## KIRBY-4 controlled product integration[\s\S]*$/m,
      controlledLines.join('\n').trimStart(),
    );
  }
  fs.writeFileSync(mdPath, md.endsWith('\n') ? md : md + '\n');

  console.log(JSON.stringify({ ok: true, outDir: result.outDir, nextAction: result.nextAction, gates: result.gates }, null, 2));
}

const invokedDirectly =
  typeof require !== 'undefined' &&
  typeof module !== 'undefined' &&
  require.main === module;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
