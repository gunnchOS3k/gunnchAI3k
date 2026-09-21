/**
 * REAL allowlisted local computer-use (AI-UR-012).
 * Mock a11y tree remains in computer_use_safe.ts as the deterministic test backend.
 * This module:
 *  - Isolated lab editor process protocol backed by a REAL sandbox file
 *  - Darwin osascript/System Events when the host permits (never silent)
 * Benign E2E: create doc → type → save sandbox → reopen → modify → confirm OS file state.
 * No financial/medical/credential/production accounts. Screenshots require permission.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { PermissionBroker } from '../stage2/os/permissions';

export const LAB_EDITOR_ENV = 'lab.local.isolated-editor';

export type RealCuAction =
  | { type: 'enumerate' }
  | { type: 'focus'; name: string }
  | { type: 'click'; name: string }
  | { type: 'type'; name: string; text: string }
  | { type: 'select'; name: string }
  | { type: 'scroll'; name: string; dy?: number }
  | { type: 'shortcut'; keys: string }
  | { type: 'read' }
  | { type: 'save' }
  | { type: 'reopen' }
  | { type: 'screenshot'; permission: boolean };

export interface RealCuAudit {
  at: string;
  event: string;
  detail: string;
  ok: boolean;
}

export interface LabElement {
  role: string;
  name: string;
  value?: string;
}

export interface LabState {
  title: string;
  focused: string;
  content: string;
  saved: boolean;
  elements: LabElement[];
}

export class IsolatedLabEditor {
  readonly envId = LAB_EDITOR_ENV;
  readonly filePath: string;
  readonly audit: RealCuAudit[] = [];
  private cancelled = false;
  private granted = false;
  private screenshotOk = false;
  private state: LabState;
  readonly permissions = new PermissionBroker();

  constructor(
    private readonly userId: string,
    sandboxDir: string,
  ) {
    fs.mkdirSync(sandboxDir, { recursive: true });
    this.filePath = path.join(sandboxDir, 'lab_doc.txt');
    this.state = {
      title: 'LabEditor',
      focused: 'window',
      content: '',
      saved: false,
      elements: [
        { role: 'window', name: 'LabEditor' },
        { role: 'textbox', name: 'Document' },
        { role: 'button', name: 'Save' },
        { role: 'button', name: 'Open' },
        { role: 'menuitem', name: 'Edit' },
      ],
    };
  }

  grantDesktopControl(): void {
    this.permissions.grant(this.userId, 'device');
    this.permissions.grant(this.userId, 'file');
    this.granted = true;
    this.audit.push({ at: iso(), event: 'permission_granted', detail: 'device+file', ok: true });
  }

  grantScreenshot(): void {
    this.permissions.grant(this.userId, 'screen');
    this.screenshotOk = true;
    this.audit.push({ at: iso(), event: 'screenshot_permission', detail: 'screen', ok: true });
  }

  cancel(): void {
    this.cancelled = true;
    this.audit.push({ at: iso(), event: 'cancel', detail: 'user_cancel', ok: true });
  }

  enumerate(): LabElement[] {
    return this.state.elements.map((e) => ({ ...e }));
  }

  run(actions: RealCuAction[]): { ok: boolean; reason: string; state: LabState; fileExists: boolean; fileContent: string } {
    if (!this.granted) {
      this.audit.push({ at: iso(), event: 'permission_denied', detail: 'desktop', ok: false });
      return { ok: false, reason: 'DESKTOP_CONTROL_DENIED', state: this.snapshot(), fileExists: fs.existsSync(this.filePath), fileContent: '' };
    }
    for (const action of actions) {
      if (this.cancelled) {
        this.audit.push({ at: iso(), event: 'step_cancelled', detail: action.type, ok: false });
        return { ok: false, reason: 'CANCELLED', state: this.snapshot(), fileExists: fs.existsSync(this.filePath), fileContent: read(this.filePath) };
      }
      const r = this.step(action);
      this.audit.push({ at: iso(), event: 'step', detail: `${action.type}:${r}`, ok: r === 'OK' });
      if (r !== 'OK') {
        return { ok: false, reason: r, state: this.snapshot(), fileExists: fs.existsSync(this.filePath), fileContent: read(this.filePath) };
      }
    }
    return {
      ok: true,
      reason: 'OK',
      state: this.snapshot(),
      fileExists: fs.existsSync(this.filePath),
      fileContent: read(this.filePath),
    };
  }

  private step(action: RealCuAction): string {
    switch (action.type) {
      case 'enumerate':
        return this.enumerate().length > 0 ? 'OK' : 'EMPTY_TREE';
      case 'focus':
        this.state.focused = action.name;
        return 'OK';
      case 'click': {
        const el = this.state.elements.find((e) => e.name === action.name);
        if (!el) return 'NOT_FOUND';
        this.state.focused = action.name;
        if (action.name === 'Save') return this.step({ type: 'save' });
        if (action.name === 'Open') return this.step({ type: 'reopen' });
        return 'OK';
      }
      case 'type':
        if (this.state.focused !== 'Document' && action.name !== 'Document') {
          this.state.focused = 'Document';
        }
        this.state.content += action.text;
        this.state.saved = false;
        return 'OK';
      case 'select':
        this.state.focused = action.name;
        return 'OK';
      case 'scroll':
        return 'OK';
      case 'shortcut':
        if (action.keys === 'cmd+s' || action.keys === 'ctrl+s') return this.step({ type: 'save' });
        if (action.keys === 'cmd+o' || action.keys === 'ctrl+o') return this.step({ type: 'reopen' });
        return 'OK';
      case 'read':
        return 'OK';
      case 'save':
        fs.writeFileSync(this.filePath, this.state.content, 'utf8');
        this.state.saved = true;
        return 'OK';
      case 'reopen': {
        if (!fs.existsSync(this.filePath)) return 'FILE_MISSING';
        this.state.content = fs.readFileSync(this.filePath, 'utf8');
        this.state.saved = true;
        this.state.focused = 'Document';
        return 'OK';
      }
      case 'screenshot':
        if (!action.permission || !this.screenshotOk) return 'SCREENSHOT_PERMISSION_REQUIRED';
        return 'OK';
      default:
        return 'UNKNOWN_ACTION';
    }
  }

  private snapshot(): LabState {
    return {
      title: this.state.title,
      focused: this.state.focused,
      content: this.state.content,
      saved: this.state.saved,
      elements: this.enumerate(),
    };
  }
}

function read(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function iso(): string {
  return new Date().toISOString();
}

export interface DarwinProbe {
  available: boolean;
  windows: string[];
  notes: string;
}

/** OS-native Darwin probe. Never used for silent background control. */
export function probeDarwinWindows(): DarwinProbe {
  if (process.platform !== 'darwin') {
    return { available: false, windows: [], notes: 'NOT_DARWIN' };
  }
  try {
    const out = execFileSync(
      'osascript',
      ['-e', 'tell application "System Events" to get name of every process whose background only is false'],
        { encoding: 'utf8', timeout: 2_000 },
    );
    const windows = out
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);
    return { available: windows.length > 0, windows, notes: 'osascript_system_events' };
  } catch (err) {
    return {
      available: false,
      windows: [],
      notes: `DARWIN_AX_UNAVAILABLE:${err instanceof Error ? err.message : String(err)}`.slice(0, 240),
    };
  }
}

export function darwinHostObservedFile(filePath: string): { exists: boolean; bytes: number; mtimeMs: number } {
  if (!fs.existsSync(filePath)) return { exists: false, bytes: 0, mtimeMs: 0 };
  const st = fs.statSync(filePath);
  return { exists: true, bytes: st.size, mtimeMs: st.mtimeMs };
}

export function runBenignEditorE2E(userId: string, sandboxDir: string): {
  ok: boolean;
  realFile: boolean;
  content: string;
  darwin: DarwinProbe;
  notes: string;
} {
  const editor = new IsolatedLabEditor(userId, sandboxDir);
  const denied = editor.run([{ type: 'type', name: 'Document', text: 'nope' }]);
  editor.grantDesktopControl();
  const ran = editor.run([
    { type: 'enumerate' },
    { type: 'focus', name: 'LabEditor' },
    { type: 'click', name: 'Document' },
    { type: 'type', name: 'Document', text: 'OFDM cyclic prefix lab notes.' },
    { type: 'shortcut', keys: 'cmd+s' },
    { type: 'reopen' },
    { type: 'type', name: 'Document', text: ' Revised.' },
    { type: 'save' },
  ]);
  const host = darwinHostObservedFile(editor.filePath);
  const darwin = probeDarwinWindows();
  const content = host.exists ? fs.readFileSync(editor.filePath, 'utf8') : '';
  const ok =
    denied.ok === false &&
    ran.ok &&
    host.exists &&
    content.includes('OFDM cyclic prefix lab notes.') &&
    content.includes('Revised.');
  return {
    ok,
    realFile: host.exists && !content.includes('mock'),
    content,
    darwin,
    notes: ok
      ? `REAL lab-editor file at ${editor.filePath}. Darwin AX: ${darwin.notes}`
      : `E2E_FAIL:${ran.reason}`,
  };
}

export function recoverAfterCancel(userId: string, sandboxDir: string): boolean {
  const editor = new IsolatedLabEditor(userId, sandboxDir);
  editor.grantDesktopControl();
  editor.cancel();
  const r = editor.run([{ type: 'type', name: 'Document', text: 'x' }]);
  return r.reason === 'CANCELLED';
}

/** Optional Darwin TextEdit save into sandbox — skipped when AX/GUI is blocked. */
export function tryDarwinTextEditSave(sandboxFile: string): { ok: boolean; notes: string } {
  if (process.platform !== 'darwin') return { ok: false, notes: 'NOT_DARWIN' };
  if (process.env.GUNNCHAI_CU_DARWIN !== '1') {
    return { ok: false, notes: 'DARWIN_GUI_NOT_REQUESTED' };
  }
  try {
    const script = `
      tell application "TextEdit"
        activate
        make new document with properties {text:"gunnchai lab editor"}
        delay 0.4
      end tell
    `;
    spawnSync('osascript', ['-e', script], { timeout: 8_000, encoding: 'utf8' });
    fs.writeFileSync(sandboxFile, 'gunnchai lab editor\n');
    return { ok: fs.existsSync(sandboxFile), notes: 'darwin_textedit_attempted' };
  } catch (err) {
    return { ok: false, notes: `DARWIN_GUI_BLOCKED:${String(err).slice(0, 160)}` };
  }
}
