import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AssessmentWorkspace } from "./components/assessment/AssessmentWorkspace";
import { InstructorQueue } from "./components/assessment/InstructorQueue";
import { CourseCard } from "./components/CourseCard";
import { LessonReader } from "./components/LessonReader";
import { TrustBanner } from "./components/TrustBanner";
import { SyncStatusBanner } from "./components/sync/SyncStatusBanner";
import { InstructorActivities } from "./components/activities/InstructorActivities";
import { LearnerActivities } from "./components/activities/LearnerActivities";
import { InstructorAiPanel, LearnerAiPanel } from "./components/ai/AiPanels";
import { AdminHardeningPanel } from "./components/admin/AdminHardeningPanel";
import { InteropStatusPanel } from "./components/interop/InteropPanels";
import { DeviceProfilePanel } from "./components/device/DeviceProfilePanel";
import { FeedbackSuggestions } from "./components/help/FeedbackSuggestions";
import type { AuthSession, HubActor, HubClient, SectionCard, SessionUser } from "./lib/hub/client";
import { HubAuthError } from "./lib/hub/client";
import { resolveHubClient } from "./lib/hub/resolveHub";
import type { SyncTransport } from "./lib/offline/syncCoordinator";
import { useOfflineSync } from "./lib/offline/useOfflineSync";
import { browseInstallPack, getInitialDeviceOsLaunchContext, isTauri, modeForDeviceOsDeepLink } from "./lib/tauriBridge";
import type { LessonContent, LessonInfo, ModuleView, TrustStatus } from "./lib/types";
import {
  mockModule,
  mockTrust,
  simulateInstallFailure,
  simulateVerifiedInstall,
} from "./lib/mockRuntime";

type Mode =
  | "lessons"
  | "home"
  | "assignments"
  | "activities"
  | "ai"
  | "instruct"
  | "instruct-activities"
  | "instruct-ai"
  | "gradebook"
  | "admin"
  | "roster"
  | "interop";

const ADMIN_WORKFLOWS = [
  "backup_restore",
  "privacy_controls",
  "diagnostics",
  "package_lifecycle",
  "oneroster_import",
];

const DEVICE_PROFILES = [
  { id: "student_14_5", name: 'Student 14.5"', research_role: "desk" },
  { id: "pro_16", name: 'Pro 16"', research_role: "authoring" },
  { id: "studio_display", name: "Studio Display", research_role: "review" },
  { id: "edge_io_wearables", name: "Edge IO Wearables", research_role: "HUD", companion_only: true },
];

/** Stable per-install id so leases and mutations are attributable to this device. */
const DEVICE_KEY = "waike_device_id";

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = `device_${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    return "device_unknown";
  }
}

const SESSION_KEY = "waike_hub_session";

function formatPackError(err: unknown): string {
  const raw = typeof err === "string" ? err : err && typeof err === "object" ? JSON.stringify(err) : String(err);
  const upper = raw.toUpperCase();
  if (upper.includes("WRONG_ROLE")) {
    return "WRONG_ROLE — Import a signed learner pack. Instructor packs are rejected here.";
  }
  if (
    upper.includes("TAMPERED") ||
    upper.includes("BAD_SIGNATURE") ||
    upper.includes("UNSIGNED") ||
    upper.includes("MISSING_SIGNATURE")
  ) {
    return "TAMPERED_CONTENT / signature failure — Package is corrupted or altered and was not trusted.";
  }
  if (
    upper.includes("INCOMPATIBLE") ||
    upper.includes("SCHEMA_DOWNGRADE") ||
    upper.includes("PLATFORM_TOO_OLD")
  ) {
    return "INCOMPATIBLE_SCHEMA — This package is incompatible with this client.";
  }
  return raw;
}

function loadSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

/** Session-authenticated transport for the offline sync coordinator (PR3 auth). */
function makeSyncTransport(baseUrl: string, getToken: () => string | null): SyncTransport {
  async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try {
        detail = (JSON.parse(text) as { detail?: string }).detail || text;
      } catch {
        /* raw body */
      }
      throw new HubAuthError(res.status, String(detail));
    }
    return (await res.json()) as T;
  }
  return {
    issueLease: (sectionId, deviceIdValue, ttlHours = 72) =>
      req("/api/v1/sync/leases", {
        method: "POST",
        body: JSON.stringify({
          section_id: sectionId,
          device_id: deviceIdValue,
          ttl_hours: ttlHours,
        }),
      }),
    getLease: (leaseId) => req(`/api/v1/sync/leases/${leaseId}`),
    applyMutation: (body) =>
      req("/api/v1/sync/mutations", { method: "POST", body: JSON.stringify(body) }),
    getReceipt: (id) => req(`/api/v1/sync/receipts/${id}`),
    pullChanges: (sectionId, sinceRevision) =>
      req(
        `/api/v1/sync/pull?section_id=${encodeURIComponent(sectionId)}&since_revision=${sinceRevision}`,
      ),
  };
}

/** Match hub primary-role precedence: site_admin > instructor > grader > learner. */
function resolvePrimaryRole(roles: string[] | undefined | null): string | null {
  if (!roles || roles.length === 0) return null;
  const order = ["site_admin", "instructor", "grader", "learner"];
  for (const r of order) {
    if (roles.includes(r)) return r;
  }
  return roles[0] ?? null;
}

export default function App() {
  const [trust, setTrust] = useState<TrustStatus>(mockTrust);
  const [module, setModule] = useState<ModuleView | null>(isTauri() ? null : mockModule);
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeOffset, setResumeOffset] = useState(0);
  const [resumeHint, setResumeHint] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("lessons");
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [sessionExpired, setSessionExpired] = useState(false);
  const [mockActor, setMockActor] = useState<HubActor>({ actorId: "learner-a", role: "learner" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [siteId, setSiteId] = useState("site-alpha");
  const [homeCards, setHomeCards] = useState<SectionCard[]>([]);
  const [sectionId] = useState("sec_alpha_dc_w01");
  const [dashboard, setDashboard] = useState<{
    metrics: { active_enrollments: number; submissions: number; ungraded: number };
  } | null>(null);
  const [roster, setRoster] = useState<Array<{ user_id: string; display_name: string; status: string }>>([]);
  const [gradebookRows, setGradebookRows] = useState<
    Array<{ learner_id: string; display_name: string; overall_percent: number | null }>
  >([]);
  const [adminUsers, setAdminUsers] = useState<
    Array<{ user_id: string; username: string; display_name: string; disabled: number; roles: string[] }>
  >([]);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [pendingDeviceOsNav, setPendingDeviceOsNav] = useState<string | null>(null);
  const [deviceOsNavApplied, setDeviceOsNavApplied] = useState(false);
  const [runtimeHubUrl, setRuntimeHubUrl] = useState<string | undefined>(undefined);
  const [runtimeHubPolicyAuthorized, setRuntimeHubPolicyAuthorized] = useState(false);

  const tokenRef = useCallback(() => session?.token ?? null, [session]);

  const onAuthFailure = useCallback((detail: string) => {
    if (detail.includes("SESSION") || detail.includes("AUTH") || detail.includes("EXPIRED")) {
      setSessionExpired(true);
      setSession(null);
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const hubResolution = useMemo(
    () =>
      resolveHubClient(tokenRef, onAuthFailure, mockActor, {
        ...(import.meta.env as { MODE?: string; VITE_HUB_URL?: string; VITE_WAIKE_MOCK_HUB?: string }),
        runtimeHubUrl,
        runtimeHubPolicyAuthorized,
      }),
    [tokenRef, onAuthFailure, mockActor, runtimeHubUrl, runtimeHubPolicyAuthorized],
  );
  const hub: HubClient | null = hubResolution.client;
  const hubUnavailable =
    hubResolution.status === "unavailable" ? hubResolution.reason : null;
  const isMock = hubResolution.status === "mock";
  const user: SessionUser | null = session?.user ?? (isMock
    ? {
        user_id: mockActor.actorId,
        username: mockActor.actorId,
        display_name: mockActor.actorId,
        site_id: "site-alpha",
        roles: [mockActor.role],
      }
    : null);
  const primaryRole = resolvePrimaryRole(user?.roles);
  const needsLogin = hubResolution.status === "http" && !session;
  const isStaff =
    primaryRole === "instructor" || primaryRole === "grader" || primaryRole === "site_admin";

  const device = useMemo(() => deviceId(), []);
  // Only a real HTTP hub can settle mutations; the mock hub has no sync ledger.
  const syncTransport: SyncTransport | null = useMemo(() => {
    if (hubResolution.status !== "http" || !session) return null;
    return makeSyncTransport(hubResolution.baseUrl, () => session.token);
  }, [hubResolution, session]);

  const sync = useOfflineSync({
    transport: syncTransport,
    sectionId,
    deviceId: device,
    siteId: user?.site_id ?? null,
    online,
  });
  const syncUx = sync.ux;

  useEffect(() => {
    if (!isTauri() || deviceOsNavApplied) return;
    (async () => {
      const ctx = await getInitialDeviceOsLaunchContext();
      if (!ctx) return;
      const hubFromCtx = ctx.context?.hub_url;
      if (typeof hubFromCtx === "string" && hubFromCtx.trim()) {
        // Native validate_request_file already authorized + normalized hub_url via HubEndpointPolicy.
        setRuntimeHubUrl(hubFromCtx.trim().replace(/\/$/, ""));
        setRuntimeHubPolicyAuthorized(true);
      }
      if (!ctx.deep_link?.valid) return;
      const next = modeForDeviceOsDeepLink(ctx.deep_link.kind);
      if (!next) return;
      // Never bypass auth: queue until a normal session (or mock) exists.
      if (needsLogin) {
        setPendingDeviceOsNav(next);
        return;
      }
      setMode(next as Mode);
      setDeviceOsNavApplied(true);
      setPendingDeviceOsNav(null);
    })();
  }, [needsLogin, deviceOsNavApplied, session, isMock]);

  useEffect(() => {
    if (!pendingDeviceOsNav || needsLogin || deviceOsNavApplied) return;
    setMode(pendingDeviceOsNav as Mode);
    setDeviceOsNavApplied(true);
    setPendingDeviceOsNav(null);
  }, [pendingDeviceOsNav, needsLogin, deviceOsNavApplied, session]);

  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      try {
        const packs = await invoke<TrustStatus[]>("list_installed_packs");
        if (packs.length === 0) return;
        const t = packs[0];
        setTrust(t);
        const lessons = await invoke<LessonInfo[]>("list_lessons", { packId: t.pack_id });
        setModule({
          pack_id: t.pack_id,
          module_id: t.module_id,
          title: t.title,
          lessons,
          trust: t,
        });
        const resume = await invoke<{
          lesson_id: string;
          scroll_offset: number;
        } | null>("get_resume_position", { packId: t.pack_id });
        if (resume) {
          setResumeHint(`Resume ${resume.lesson_id} @ ${Math.round(resume.scroll_offset)}px`);
        }
      } catch (e) {
        setError(formatPackError(e));
      }
    })();
  }, []);

  async function onInstall() {
    setError(null);
    try {
      if (!isTauri()) {
        const failure = (window as unknown as { __WAIKE_MOCK_FAIL__?: string }).__WAIKE_MOCK_FAIL__;
        if (failure) {
          throw simulateInstallFailure(failure);
        }
        const verified = simulateVerifiedInstall();
        setTrust(verified.trust);
        setModule(verified.module);
        setResumeHint(verified.resumeHint);
        if (verified.resumeLesson) {
          setLesson(verified.resumeLesson);
          setResumeOffset(verified.resumeLesson.resume_scroll_offset);
        }
        return;
      }
      const path = await browseInstallPack();
      if (!path) return;
      const t = await invoke<TrustStatus>("install_learner_pack", { path });
      setTrust(t);
      if (!t.trusted) {
        setError(t.verification_status);
        return;
      }
      const lessons = await invoke<LessonInfo[]>("list_lessons", { packId: t.pack_id });
      setModule({
        pack_id: t.pack_id,
        module_id: t.module_id,
        title: t.title,
        lessons,
        trust: t,
      });
    } catch (e) {
      setError(formatPackError(e));
    }
  }

  async function onOpenLesson(info: LessonInfo) {
    setError(null);
    try {
      if (!isTauri() || !module) {
        const resume =
          (window as unknown as { __WAIKE_RESUME_OFFSET__?: number }).__WAIKE_RESUME_OFFSET__ ?? 0;
        setLesson({
          lesson_id: info.lesson_id,
          title: info.title,
          path: info.path,
          markdown: `# ${info.title}\n\nReal lesson content from the pack (preview).`,
          resume_scroll_offset: resume,
        });
        setResumeOffset(resume);
        if (resume > 0) {
          setResumeHint(`Resume ${info.lesson_id} @ ${Math.round(resume)}px`);
        }
        return;
      }
      const content = await invoke<LessonContent>("open_lesson", {
        packId: module.pack_id,
        lessonId: info.lesson_id,
      });
      setLesson(content);
      setResumeOffset(content.resume_scroll_offset || 0);
      if (content.resume_scroll_offset > 0) {
        setResumeHint(
          `Resume ${content.lesson_id} @ ${Math.round(content.resume_scroll_offset)}px`,
        );
      }
    } catch (e) {
      setError(formatPackError(e));
    }
  }

  const onSavePosition = useCallback(
    async (offset: number) => {
      if (!lesson || !module) return;
      if (!isTauri()) {
        (window as unknown as { __WAIKE_RESUME_OFFSET__?: number }).__WAIKE_RESUME_OFFSET__ = offset;
        setResumeHint(`Resume ${lesson.lesson_id} @ ${Math.round(offset)}px`);
        return;
      }
      await invoke("save_lesson_position", {
        packId: module.pack_id,
        lessonId: lesson.lesson_id,
        path: lesson.path,
        scrollOffset: offset,
      });
    },
    [lesson, module],
  );

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!hub) {
      setError("School Hub not configured / unavailable");
      return;
    }
    setLoading(true);
    setError(null);
    setSessionExpired(false);
    try {
      if (isTauri()) {
        void invoke("report_client_diag", {
          kind: "hub_login_fetch_start",
          detail: hubResolution.status === "http" ? hubResolution.baseUrl : "unknown",
        }).catch(() => undefined);
      }
      const s = await hub.login(username, password, siteId);
      setSession(s);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      const role = resolvePrimaryRole(s.user.roles);
      // Prefer queued Device OS navigation after normal auth — never skip login.
      if (pendingDeviceOsNav) {
        setMode(pendingDeviceOsNav as Mode);
        setDeviceOsNavApplied(true);
        setPendingDeviceOsNav(null);
      } else {
        setMode(role === "learner" ? "home" : "instruct");
      }
    } catch (err) {
      const detail = err instanceof HubAuthError ? err.detail : String(err);
      if (isTauri()) {
        void invoke("report_client_diag", {
          kind: "hub_login_fetch_error",
          detail,
        }).catch(() => undefined);
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    if (hub && session) {
      try {
        await hub.logout();
      } catch {
        /* revoke best-effort */
      }
    }
    setSession(null);
    sessionStorage.removeItem(SESSION_KEY);
    setMode("lessons");
  }

  useEffect(() => {
    if (!hub || (!session && !isMock)) return;
    if (mode === "home" && (primaryRole === "learner" || isMock)) {
      void hub.learnerHome().then(setHomeCards).catch((err) => setError(String(err)));
    }
    if (mode === "instruct") {
      void hub
        .instructorDashboard(sectionId)
        .then((d) => setDashboard(d))
        .catch((err) => setError(String(err)));
    }
    if (mode === "roster") {
      void hub.roster(sectionId).then(setRoster).catch((err) => setError(String(err)));
    }
    if (mode === "gradebook") {
      void hub
        .sectionGradebook(sectionId)
        .then((g) =>
          setGradebookRows(
            g.rows.map((r) => ({
              learner_id: r.learner_id,
              display_name: r.display_name,
              overall_percent: r.overall_percent,
            })),
          ),
        )
        .catch((err) => setError(String(err)));
    }
    if (mode === "admin" && primaryRole === "site_admin") {
      void hub.listUsers().then(setAdminUsers).catch((err) => setError(String(err)));
    }
  }, [hub, session, isMock, mode, primaryRole, sectionId]);

  function HubUnavailablePanel({ title }: { title: string }) {
    return (
      <section className="panel" data-testid="hub-unavailable">
        <h2>{title}</h2>
        <div className="error-box" role="alert" data-testid="hub-unavailable-message">
          {hubUnavailable || "School Hub not configured / unavailable"}
        </div>
        <p className="muted">
          Set <code>VITE_HUB_URL</code> to a school hub, or enable the explicit test mock with{" "}
          <code>VITE_WAIKE_MOCK_HUB=true</code>. Assessment features will not fake submission or
          grading without a hub.
        </p>
      </section>
    );
  }

  if (needsLogin) {
    return (
      <div className="app-shell">
        <header>
          <h1 className="brand">WAIKE Learning OS</h1>
          <p className="tagline">Sign in to your school hub session.</p>
        </header>
        {sessionExpired ? (
          <div className="error-box" role="alert" data-testid="session-expired">
            Session expired — please sign in again.
          </div>
        ) : null}
        <form className="panel" onSubmit={(e) => void onLogin(e)} data-testid="login-form">
          <h2>Sign in</h2>
          <label className="field-label" htmlFor="site-id">
            Site ID
          </label>
          <input
            id="site-id"
            data-testid="login-site-id"
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            autoComplete="organization"
            required
          />
          <label className="field-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            data-testid="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            data-testid="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" data-testid="login-submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {error ? (
            <div className="error-box" role="alert">
              {error}
            </div>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <h1 className="brand">WAIKE Learning OS</h1>
        <p className="tagline">
          Local-first learning client. Packages are verified before trust. Multi-user identity and
          gradebook are live for DIGITAL_CONFIDENCE.
        </p>
        <div className="toolbar">
          <button type="button" onClick={() => void onInstall()}>
            Install learner pack
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setLesson(null);
              setError(null);
              setMode("lessons");
            }}
          >
            Back to module
          </button>
          {user ? (
            <button type="button" className="ghost" data-testid="logout-btn" onClick={() => void onLogout()}>
              Sign out ({user.display_name})
            </button>
          ) : null}
        </div>
        <div className="mode-bar" role="navigation" aria-label="Primary">
          <button
            type="button"
            className={mode === "lessons" ? "mode-active" : "ghost"}
            onClick={() => setMode("lessons")}
          >
            Lessons
          </button>
          {(primaryRole === "learner" || isMock) && (
            <>
              <button
                type="button"
                className={mode === "home" ? "mode-active" : "ghost"}
                data-testid="mode-home"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "learner-a", role: "learner" });
                  setMode("home");
                }}
              >
                Home
              </button>
              <button
                type="button"
                className={mode === "assignments" ? "mode-active" : "ghost"}
                data-testid="mode-assignments"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "learner-a", role: "learner" });
                  setMode("assignments");
                }}
              >
                Assignments
              </button>
              <button
                type="button"
                className={mode === "activities" ? "mode-active" : "ghost"}
                data-testid="mode-activities"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "learner-a", role: "learner" });
                  setMode("activities");
                }}
              >
                Activities
              </button>
              <button
                type="button"
                className={mode === "ai" ? "mode-active" : "ghost"}
                data-testid="mode-ai"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "learner-a", role: "learner" });
                  setMode("ai");
                }}
              >
                AI tutor
              </button>
            </>
          )}
          {(primaryRole === "instructor" ||
            primaryRole === "grader" ||
            primaryRole === "site_admin" ||
            isMock) && (
            <>
              <button
                type="button"
                className={mode === "instruct" ? "mode-active" : "ghost"}
                data-testid="mode-instruct"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "instructor-1", role: "instructor" });
                  setMode("instruct");
                }}
              >
                Instruct
              </button>
              <button
                type="button"
                className={mode === "roster" ? "mode-active" : "ghost"}
                data-testid="mode-roster"
                onClick={() => setMode("roster")}
              >
                Roster
              </button>
              <button
                type="button"
                className={mode === "instruct-activities" ? "mode-active" : "ghost"}
                data-testid="mode-instruct-activities"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "instructor-1", role: "instructor" });
                  setMode("instruct-activities");
                }}
              >
                Activity grading
              </button>
              <button
                type="button"
                className={mode === "instruct-ai" ? "mode-active" : "ghost"}
                data-testid="mode-instruct-ai"
                onClick={() => {
                  if (isMock) setMockActor({ actorId: "instructor-1", role: "instructor" });
                  setMode("instruct-ai");
                }}
              >
                AI suggestions
              </button>
            </>
          )}
          <button
            type="button"
            className={mode === "gradebook" ? "mode-active" : "ghost"}
            data-testid="mode-gradebook"
            onClick={() => setMode("gradebook")}
          >
            Gradebook
          </button>
          {primaryRole === "site_admin" ? (
            <button
              type="button"
              className={mode === "admin" ? "mode-active" : "ghost"}
              data-testid="mode-admin"
              onClick={() => setMode("admin")}
            >
              Admin
            </button>
          ) : null}
          {(primaryRole === "site_admin" || primaryRole === "instructor" || isMock) && (
            <button
              type="button"
              className={mode === "interop" ? "mode-active" : "ghost"}
              data-testid="mode-interop"
              onClick={() => setMode("interop")}
            >
              Interop
            </button>
          )}
          {user ? (
            <span className="muted actor-chip" data-testid="session-chip">
              {primaryRole}:{user.username}
            </span>
          ) : null}
          {hubResolution.status === "mock" ? (
            <span className="muted" data-testid="hub-mode-chip">
              hub:mock
            </span>
          ) : null}
          {hubResolution.status === "http" ? (
            <span className="muted" data-testid="hub-mode-chip">
              hub:http
            </span>
          ) : null}
          {hubResolution.status === "unavailable" ? (
            <span className="muted" data-testid="hub-mode-chip">
              hub:unavailable
            </span>
          ) : null}
        </div>
      </header>

      <TrustBanner trust={trust} />
      <SyncStatusBanner state={syncUx} />
      {resumeHint ? (
        <p className="muted" data-testid="resume-hint">
          {resumeHint}
        </p>
      ) : null}
      {sessionExpired ? (
        <div className="error-box" role="alert" data-testid="session-expired">
          Session expired
        </div>
      ) : null}
      {error ? (
        <div className="error-box" role="alert" data-testid="error-box">
          {error}
        </div>
      ) : null}

      <div className="layout" id="main">
        {mode === "lessons" ? (
          <>
            {module ? (
              <CourseCard module={module} onOpenLesson={(l) => void onOpenLesson(l)} />
            ) : (
              <section className="course-card">
                <h2>No course installed</h2>
                <p className="muted">Install a signed DIGITAL_CONFIDENCE learner pack to begin.</p>
              </section>
            )}
            {lesson ? (
              <LessonReader
                lesson={lesson}
                resumeOffset={resumeOffset}
                onSavePosition={(o) => void onSavePosition(o)}
              />
            ) : (
              <section className="lesson-reader">
                <h2>Lesson reader</h2>
                <p className="muted">Select a lesson after the pack verifies.</p>
              </section>
            )}
          </>
        ) : null}
        {mode === "activities" ? (
          hub ? (
            <section className="panel" data-testid="learner-activities">
              <h2>Activities</h2>
              {sync.state && sync.state.needsAttention > 0 ? (
                <p role="alert" data-testid="sync-attention">
                  {sync.state.needsAttention} item(s) need your attention before your work is
                  fully submitted.
                </p>
              ) : null}
              <LearnerActivities activities={hub.activities} sectionId={sectionId} />
            </section>
          ) : (
            <section className="panel">
              <p className="muted">{hubUnavailable}</p>
            </section>
          )
        ) : null}
        {mode === "ai" ? (
          hub ? (
            <LearnerAiPanel ai={hub.ai} sectionId={sectionId} />
          ) : (
            <HubUnavailablePanel title="AI tutor" />
          )
        ) : null}
        {mode === "instruct-activities" ? (
          hub && isStaff ? (
            <section className="panel" data-testid="instructor-activities">
              <h2>Activity grading</h2>
              <InstructorActivities
                activities={hub.activities}
                staff={hub.instructorActivities}
                sectionId={sectionId}
              />
            </section>
          ) : (
            <section className="panel">
              <p className="muted">{hubUnavailable ?? "Staff access required."}</p>
            </section>
          )
        ) : null}
        {mode === "instruct-ai" ? (
          hub && isStaff ? (
            <InstructorAiPanel ai={hub.ai} sectionId={sectionId} />
          ) : (
            <HubUnavailablePanel title="AI suggestions" />
          )
        ) : null}
        {mode === "home" ? (
          hub ? (
            <section className="panel" data-testid="learner-home">
              <h2>My sections</h2>
              {homeCards.length === 0 ? (
                <p className="muted" data-testid="empty-home">
                  No active enrollments.
                </p>
              ) : (
                <ul>
                  {homeCards.map((c) => (
                    <li key={c.section_id}>
                      <strong>{c.title}</strong> ({c.code})
                      {c.mastery ? (
                        <span className="muted">
                          {" "}
                          · mastery={c.mastery.mastered ? "yes" : "gap"}
                        </span>
                      ) : null}
                      {c.recent_feedback[0] ? (
                        <p className="muted">Feedback: {c.recent_feedback[0].body}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <HubUnavailablePanel title="Learner home" />
          )
        ) : null}
        {mode === "assignments" ? (
          hub ? (
            <AssessmentWorkspace hub={hub} />
          ) : (
            <HubUnavailablePanel title="Assignments" />
          )
        ) : null}
        {mode === "instruct" ? (
          hub ? (
            <>
              <section className="panel" data-testid="instructor-dashboard">
                <h2>Instructor dashboard</h2>
                {dashboard ? (
                  <p data-testid="instructor-metrics">
                    Enrolled {dashboard.metrics.active_enrollments} · Submissions{" "}
                    {dashboard.metrics.submissions} · Ungraded {dashboard.metrics.ungraded}
                  </p>
                ) : (
                  <p className="muted">Loading metrics…</p>
                )}
              </section>
              <InstructorQueue hub={hub} />
            </>
          ) : (
            <HubUnavailablePanel title="Instructor grading queue" />
          )
        ) : null}
        {mode === "roster" ? (
          hub ? (
            <section className="panel" data-testid="roster-panel">
              <h2>Section roster</h2>
              {roster.length === 0 ? (
                <p className="muted">No enrollments.</p>
              ) : (
                <ul>
                  {roster.map((r) => (
                    <li key={r.user_id}>
                      {r.display_name} · {r.status}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <HubUnavailablePanel title="Roster" />
          )
        ) : null}
        {mode === "gradebook" ? (
          hub ? (
            <section className="panel" data-testid="gradebook-panel">
              <h2>Gradebook</h2>
              {gradebookRows.length === 0 ? (
                <p className="muted">No scores yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Learner</th>
                      <th scope="col">Overall %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradebookRows.map((r) => (
                      <tr key={r.learner_id}>
                        <td>{r.display_name}</td>
                        <td>{r.overall_percent == null ? "—" : r.overall_percent.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ) : (
            <HubUnavailablePanel title="Gradebook" />
          )
        ) : null}
        {mode === "admin" ? (
          hub ? (
            <section className="panel" data-testid="admin-console">
              <h2>Site admin</h2>
              <AdminHardeningPanel workflows={ADMIN_WORKFLOWS} hub={hub} />
              <ul>
                {adminUsers.map((u) => (
                  <li key={u.user_id}>
                    {u.username} · {u.roles.join(",")} · {u.disabled ? "disabled" : "active"}
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        void hub
                          .disableUser(u.user_id, !u.disabled)
                          .then(() => hub.listUsers().then(setAdminUsers))
                      }
                    >
                      {u.disabled ? "Enable" : "Disable"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <HubUnavailablePanel title="Admin" />
          )
        ) : null}
        {mode === "interop" ? (
          hub ? (
            <>
              <InteropStatusPanel hub={hub} />
              <DeviceProfilePanel profiles={DEVICE_PROFILES} />
            </>
          ) : (
            <HubUnavailablePanel title="Interop" />
          )
        ) : null}
      </div>
      <FeedbackSuggestions role={primaryRole} />
    </div>
  );
}
