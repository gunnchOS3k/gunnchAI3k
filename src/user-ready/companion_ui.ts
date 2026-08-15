/**
 * AI-UR-015 Companion UX surfaces (digital).
 * Conversation / workspace / skills / memory / voice / computer-use consent /
 * privacy / offline. HUMAN polish is NOT validated without a human (HUMAN_E6=false).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { VISUAL_UNAVAILABLE } from './tokens';

export type CompanionSurfaceId =
  | 'conversation'
  | 'workspace'
  | 'skills'
  | 'memory'
  | 'voice'
  | 'computer_use_consent'
  | 'privacy'
  | 'offline';

export interface CompanionSurface {
  id: CompanionSurfaceId;
  title: string;
  description: string;
  actions: string[];
  offlineCapable: boolean;
}

export const REQUIRED_SURFACES: CompanionSurface[] = [
  {
    id: 'conversation',
    title: 'Conversation',
    description: 'Local-first chat with tool-auth awareness.',
    actions: ['send', 'stop', 'export'],
    offlineCapable: true,
  },
  {
    id: 'workspace',
    title: 'Cowrite Workspace',
    description: 'Create/edit/persist documents with provenance.',
    actions: ['new', 'edit', 'reopen', 'versions'],
    offlineCapable: true,
  },
  {
    id: 'skills',
    title: 'Skills & Custom Agents',
    description: 'Install manifests, consent permissions, fail-closed invoke.',
    actions: ['install', 'consent', 'invoke', 'audit'],
    offlineCapable: true,
  },
  {
    id: 'memory',
    title: 'Memory',
    description: 'Project-scoped encrypted memory; no silent cloud sync.',
    actions: ['remember', 'forget', 'isolate'],
    offlineCapable: true,
  },
  {
    id: 'voice',
    title: 'Realtime Voice',
    description: 'Mic permission, mute, barge-in, LOCAL vs PROVIDER privacy.',
    actions: ['grant_mic', 'mute', 'barge_in', 'end'],
    offlineCapable: false,
  },
  {
    id: 'computer_use_consent',
    title: 'Computer Use Consent',
    description: 'Allowlisted lab env only; cancel; audit; no surveillance.',
    actions: ['grant_desktop', 'attach_env', 'cancel', 'audit'],
    offlineCapable: true,
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Network/cloud disclosure toggles; deny-by-default tools.',
    actions: ['review_grants', 'revoke', 'export_audit'],
    offlineCapable: true,
  },
  {
    id: 'offline',
    title: 'Offline Mode',
    description: 'Core tutor/workspace/skills/memory without network.',
    actions: ['enable_offline', 'status'],
    offlineCapable: true,
  },
];

export interface CompanionChromeReport {
  ok: boolean;
  surfaces: CompanionSurface[];
  htmlPath: string | null;
  pixels: typeof VISUAL_UNAVAILABLE | string;
  humanPolishValidated: false;
  notes: string;
}

export function renderCompanionChrome(outDir: string): CompanionChromeReport {
  fs.mkdirSync(outDir, { recursive: true });
  const missing = REQUIRED_SURFACES.filter((s) => !s.id || !s.actions.length);
  if (missing.length) {
    return {
      ok: false,
      surfaces: REQUIRED_SURFACES,
      htmlPath: null,
      pixels: VISUAL_UNAVAILABLE,
      humanPolishValidated: false,
      notes: 'MISSING_SURFACES',
    };
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>gunnchAI Companion</title>
  <style>
    :root { --bg:#0f1419; --fg:#e7ecf1; --accent:#3d9a7a; --muted:#8a97a5; }
    body { margin:0; font-family: "IBM Plex Sans", "Source Sans 3", sans-serif; background:linear-gradient(160deg,#0f1419,#1a2430 55%,#122018); color:var(--fg); }
    header { padding:1.5rem 2rem; border-bottom:1px solid #243040; }
    header h1 { margin:0; font-size:1.6rem; letter-spacing:0.04em; }
    header p { margin:0.4rem 0 0; color:var(--muted); max-width:42rem; }
    main { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1rem; padding:1.5rem 2rem 3rem; }
    section { padding:1rem; border:1px solid #2a3a4a; border-radius:6px; background:rgba(20,28,36,0.72); }
    section h2 { margin:0 0 0.4rem; font-size:1.05rem; color:var(--accent); }
    section p { margin:0 0 0.6rem; font-size:0.9rem; color:var(--muted); }
    ul { margin:0; padding-left:1.1rem; font-size:0.85rem; }
    .badge { display:inline-block; margin-top:0.6rem; font-size:0.75rem; color:#9ad7bf; }
  </style>
</head>
<body>
  <header>
    <h1>gunnchAI Companion</h1>
    <p>Digital companion chrome for conversation, workspace, skills, memory, voice, computer-use consent, privacy, and offline. HUMAN polish not validated.</p>
  </header>
  <main>
    ${REQUIRED_SURFACES.map(
      (s) => `<section data-surface="${s.id}">
      <h2>${s.title}</h2>
      <p>${s.description}</p>
      <ul>${s.actions.map((a) => `<li>${a}</li>`).join('')}</ul>
      <span class="badge">${s.offlineCapable ? 'offline-capable' : 'may need consent/network'}</span>
    </section>`,
    ).join('\n')}
  </main>
</body>
</html>
`;
  const htmlPath = path.join(outDir, 'companion_chrome.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  return {
    ok: true,
    surfaces: REQUIRED_SURFACES,
    htmlPath,
    pixels: VISUAL_UNAVAILABLE,
    humanPolishValidated: false,
    notes:
      'PARTIAL: static HTML companion surface catalog. No button→backend wiring. HUMAN_E6 remains false.',
  };
}
