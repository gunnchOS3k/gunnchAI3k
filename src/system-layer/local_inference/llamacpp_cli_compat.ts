/**
 * llama.cpp CLI capability adapter.
 *
 * Tip llama-cli (post-CLI split) no longer accepts -no-cnv / --no-conversation;
 * those flags live on llama-completion only. This module probes --help and maps
 * conversation-mode intent to the supported syntax without pinning an obsolete
 * llama.cpp revision.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ConversationModeIntent = 'disabled' | 'enabled' | 'auto';

export type LlamaBinaryKind = 'llama-cli' | 'llama-completion' | 'unknown';

export interface LlamaCliCapability {
  binary: string;
  kind: LlamaBinaryKind;
  version: string | null;
  helpText: string;
  supportsNoCnv: boolean;
  supportsConversation: boolean;
  supportsSingleTurn: boolean;
  supportsSimpleIo: boolean;
  supportsNoWarmup: boolean;
  supportsLogDisable: boolean;
}

export interface BuildLlamaArgsInput {
  modelPath: string;
  prompt: string;
  nPredict: number;
  ctx: number;
  ngl?: number;
  temperature?: number;
  conversationMode?: ConversationModeIntent;
  /** Prefer non-interactive one-shot completion (Local Fast / MCQ / benches). */
  singleTurn?: boolean;
  simpleIo?: boolean;
  noWarmup?: boolean;
  logDisable?: boolean;
  /** Optional binary override (tests / explicit path). */
  binary?: string | null;
  /** Injected help text for unit tests (skips exec). */
  helpTextOverride?: string | null;
  /** Injected version string for unit tests. */
  versionOverride?: string | null;
}

export interface BuiltLlamaInvocation {
  binary: string;
  args: string[];
  capability: LlamaCliCapability;
  conversationModeApplied: ConversationModeIntent;
  conversationFlag: string | null;
  notes: string[];
}

const HELP_CACHE = new Map<string, { help: string; version: string | null; at: number }>();
const HELP_TTL_MS = 60_000;

function which(bin: string): string | null {
  try {
    const out = execFileSync('which', [bin], { encoding: 'utf8' }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function classifyBinary(binary: string): LlamaBinaryKind {
  const base = path.basename(binary).toLowerCase();
  if (base === 'llama-completion' || base.startsWith('llama-completion')) {
    return 'llama-completion';
  }
  if (base === 'llama-cli' || base.startsWith('llama-cli')) {
    return 'llama-cli';
  }
  return 'unknown';
}

function readCachedProbe(binary: string): { help: string; version: string | null } | null {
  const hit = HELP_CACHE.get(binary);
  if (!hit) return null;
  if (Date.now() - hit.at > HELP_TTL_MS) {
    HELP_CACHE.delete(binary);
    return null;
  }
  return { help: hit.help, version: hit.version };
}

function writeCachedProbe(binary: string, help: string, version: string | null): void {
  HELP_CACHE.set(binary, { help, version, at: Date.now() });
}

/** Test helper: clear help/version cache. */
export function clearLlamaCliCompatCache(): void {
  HELP_CACHE.clear();
}

export function probeLlamaHelp(binary: string): string {
  const cached = readCachedProbe(binary);
  if (cached) return cached.help;
  try {
    const help = execFileSync(binary, ['--help'], {
      encoding: 'utf8',
      timeout: 15_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    let version: string | null = null;
    try {
      const verProc = execFileSync(binary, ['--version'], {
        encoding: 'utf8',
        timeout: 10_000,
      });
      version = String(verProc).trim() || null;
    } catch (verErr) {
      const any = verErr as { stdout?: string; stderr?: string };
      const salvage = `${any.stdout || ''}\n${any.stderr || ''}`.trim();
      version = salvage || null;
    }
    writeCachedProbe(binary, help, version);
    return help;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Some builds print help on stderr and exit non-zero; salvage that text.
    const any = err as { stdout?: string; stderr?: string };
    const salvage = `${any.stdout || ''}\n${any.stderr || ''}`.trim();
    if (salvage.includes('-m') || salvage.includes('--help')) {
      writeCachedProbe(binary, salvage, null);
      return salvage;
    }
    throw new Error(`LLAMA_HELP_PROBE_FAILED:${binary}:${msg}`);
  }
}

export function probeLlamaVersion(binary: string): string | null {
  const cached = readCachedProbe(binary);
  if (cached?.version) return cached.version;
  try {
    const version = execFileSync(binary, ['--version'], {
      encoding: 'utf8',
      timeout: 10_000,
    }).trim();
    const help = probeLlamaHelp(binary);
    writeCachedProbe(binary, help, version || cached?.version || null);
    return version || cached?.version || null;
  } catch (err) {
    const any = err as { stdout?: string; stderr?: string };
    const salvage = `${any.stdout || ''}\n${any.stderr || ''}`.trim();
    if (salvage) {
      const help = cached?.help || probeLlamaHelp(binary);
      writeCachedProbe(binary, help, salvage);
      return salvage;
    }
    return cached?.version ?? null;
  }
}

function helpHasFlag(help: string, ...needles: string[]): boolean {
  const lower = help.toLowerCase();
  return needles.some((n) => {
    const token = n.toLowerCase();
    // Match flag tokens as whole CLI tokens (avoid substring false positives).
    const re = new RegExp(
      `(?:^|[\\s,|])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,|=])`,
      'm',
    );
    return re.test(lower) || lower.includes(token);
  });
}

export function parseLlamaCapability(
  binary: string,
  helpText: string,
  version: string | null = null,
): LlamaCliCapability {
  return {
    binary,
    kind: classifyBinary(binary),
    version,
    helpText,
    supportsNoCnv: helpHasFlag(helpText, '-no-cnv', '--no-conversation'),
    supportsConversation: helpHasFlag(helpText, '-cnv', '--conversation'),
    supportsSingleTurn: helpHasFlag(helpText, '-st', '--single-turn'),
    supportsSimpleIo: helpHasFlag(helpText, '--simple-io'),
    supportsNoWarmup: helpHasFlag(helpText, '--no-warmup'),
    supportsLogDisable: helpHasFlag(helpText, '--log-disable'),
  };
}

export function probeLlamaCapability(
  binary: string,
  opts?: { helpTextOverride?: string | null; versionOverride?: string | null },
): LlamaCliCapability {
  const help =
    opts?.helpTextOverride != null && opts.helpTextOverride !== undefined
      ? opts.helpTextOverride
      : probeLlamaHelp(binary);
  const version =
    opts?.versionOverride !== undefined
      ? opts.versionOverride
      : probeLlamaVersion(binary);
  return parseLlamaCapability(binary, help, version);
}

/**
 * Discover a binary suitable for one-shot completion / non-conversation runs.
 * Prefers llama-cli when it still supports -no-cnv (legacy / Homebrew).
 * On tip installs where llama-cli dropped -no-cnv, prefers llama-completion.
 */
export function discoverLlamaCompletionBinary(): string | null {
  const envPreferred =
    process.env.GUNNCHAI3K_LLAMA_COMPLETION_BIN ||
    process.env.GUNNCHAI3K_LLAMA_CLI_BIN ||
    null;

  const candidates = [
    envPreferred,
    which('llama-cli'),
    which('llama-completion'),
    '/opt/homebrew/bin/llama-cli',
    '/usr/local/bin/llama-cli',
    '/opt/homebrew/bin/llama-completion',
    '/usr/local/bin/llama-completion',
  ].filter((p): p is string => Boolean(p));

  const seen = new Set<string>();
  const existing: string[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    if (fs.existsSync(candidate)) existing.push(candidate);
  }
  if (existing.length === 0) return null;

  // Prefer a binary whose --help still lists -no-cnv (preserves disable-conversation intent).
  for (const candidate of existing) {
    try {
      const cap = probeLlamaCapability(candidate);
      if (cap.supportsNoCnv) return candidate;
    } catch {
      /* try next */
    }
  }

  // Tip llama-cli without -no-cnv: prefer sibling llama-completion if present.
  const completion = existing.find((p) => classifyBinary(p) === 'llama-completion');
  if (completion) return completion;

  return existing[0];
}

/** Backward-compatible discover: any llama binary usable for inference. */
export function discoverLlamaBinary(): string | null {
  return discoverLlamaCompletionBinary();
}

function siblingCompletionBinary(cliBinary: string): string | null {
  const dir = path.dirname(cliBinary);
  const sibling = path.join(dir, 'llama-completion');
  if (fs.existsSync(sibling)) return sibling;
  return which('llama-completion');
}

/**
 * Map conversation-mode intent onto flags supported by the selected binary.
 * Never silently drops disable-conversation intent when an alternate syntax exists.
 */
export function selectConversationFlags(
  capability: LlamaCliCapability,
  intent: ConversationModeIntent,
  opts?: { preferSingleTurn?: boolean },
): { flags: string[]; applied: ConversationModeIntent; conversationFlag: string | null; notes: string[] } {
  const notes: string[] = [];
  if (intent === 'auto') {
    return { flags: [], applied: 'auto', conversationFlag: null, notes };
  }

  if (intent === 'enabled') {
    if (capability.supportsConversation) {
      return {
        flags: ['--conversation'],
        applied: 'enabled',
        conversationFlag: '--conversation',
        notes,
      };
    }
    notes.push('CONVERSATION_ENABLE_UNSUPPORTED');
    return { flags: [], applied: 'auto', conversationFlag: null, notes };
  }

  // intent === 'disabled'
  if (capability.supportsNoCnv) {
    return {
      flags: ['-no-cnv'],
      applied: 'disabled',
      conversationFlag: '-no-cnv',
      notes,
    };
  }

  // Modern llama-cli: -no-cnv removed; use single-turn conversation as one-shot map.
  if (capability.supportsSingleTurn || opts?.preferSingleTurn) {
    notes.push('MAPPED_NO_CNV_TO_SINGLE_TURN');
    return {
      flags: capability.supportsSingleTurn ? ['-st'] : [],
      applied: 'disabled',
      conversationFlag: capability.supportsSingleTurn ? '-st' : null,
      notes,
    };
  }

  notes.push('NO_CNV_UNSUPPORTED_NO_FALLBACK');
  return { flags: [], applied: 'auto', conversationFlag: null, notes };
}

export function resolveBinaryForIntent(
  intent: ConversationModeIntent,
  preferredBinary?: string | null,
  opts?: { helpTextOverride?: string | null; versionOverride?: string | null },
): { binary: string; capability: LlamaCliCapability; notes: string[] } {
  const notes: string[] = [];
  let binary = preferredBinary || discoverLlamaCompletionBinary();
  if (!binary) {
    throw new Error('LLAMA_CLI_ABSENT');
  }

  let capability = probeLlamaCapability(binary, opts);

  // Completion/non-cnv intent: if selected binary lacks -no-cnv, prefer llama-completion.
  // Skip binary switching when help is injected (unit tests) so overrides stay coherent.
  if (
    intent === 'disabled' &&
    !capability.supportsNoCnv &&
    opts?.helpTextOverride == null
  ) {
    const completion =
      capability.kind === 'llama-completion'
        ? null
        : siblingCompletionBinary(binary) || which('llama-completion');
    if (completion && completion !== binary) {
      const completionCap = probeLlamaCapability(completion, opts);
      if (completionCap.supportsNoCnv || completionCap.kind === 'llama-completion') {
        notes.push(`SWITCHED_TO_LLAMA_COMPLETION_FOR_NO_CNV:${path.basename(completion)}`);
        binary = completion;
        capability = completionCap;
      }
    }
  }

  return { binary, capability, notes };
}

export function buildLlamaInvocation(input: BuildLlamaArgsInput): BuiltLlamaInvocation {
  const intent = input.conversationMode ?? 'disabled';
  const resolved = resolveBinaryForIntent(intent, input.binary, {
    helpTextOverride: input.helpTextOverride,
    versionOverride: input.versionOverride,
  });
  const notes = [...resolved.notes];
  const { binary, capability } = resolved;

  const conv = selectConversationFlags(capability, intent, {
    preferSingleTurn: input.singleTurn !== false,
  });
  notes.push(...conv.notes);

  if (intent === 'disabled' && conv.applied !== 'disabled' && !conv.conversationFlag) {
    throw new Error(
      `LLAMA_CONVERSATION_DISABLE_UNSUPPORTED:binary=${path.basename(binary)} ` +
        `(tip llama-cli dropped -no-cnv; install/build llama-completion or use a binary whose --help lists -no-cnv/--no-conversation or -st)`,
    );
  }

  const args: string[] = [
    '-m',
    input.modelPath,
    '-p',
    input.prompt,
    '-n',
    String(input.nPredict),
    '-c',
    String(input.ctx),
    '-ngl',
    String(input.ngl ?? 0),
    '--temp',
    String(input.temperature ?? 0.2),
  ];

  if (input.noWarmup !== false && capability.supportsNoWarmup) {
    args.push('--no-warmup');
  } else if (input.noWarmup !== false && !capability.supportsNoWarmup) {
    notes.push('SKIPPED_UNSUPPORTED_FLAG:--no-warmup');
  }

  args.push(...conv.flags);

  // Avoid duplicating -st when conversation mapping already emitted it.
  const wantSingleTurn = input.singleTurn !== false;
  if (wantSingleTurn && capability.supportsSingleTurn && !conv.flags.includes('-st')) {
    args.push('-st');
  }

  if (input.simpleIo !== false && capability.supportsSimpleIo) {
    args.push('--simple-io');
  } else if (input.simpleIo !== false && !capability.supportsSimpleIo) {
    notes.push('SKIPPED_UNSUPPORTED_FLAG:--simple-io');
  }

  if (input.logDisable !== false && capability.supportsLogDisable) {
    args.push('--log-disable');
  } else if (input.logDisable !== false && !capability.supportsLogDisable) {
    notes.push('SKIPPED_UNSUPPORTED_FLAG:--log-disable');
  }

  return {
    binary,
    args,
    capability,
    conversationModeApplied: conv.applied,
    conversationFlag: conv.conversationFlag,
    notes,
  };
}

/**
 * True when stderr is only GPU / device availability noise and should not fail a run
 * that otherwise produced usable stdout (or a soft GPU warning with empty stdout).
 */
export function isGpuWarningOnly(stderr: string): boolean {
  const text = stderr.trim();
  if (!text) return false;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  const gpuRe =
    /gpu|ggml_cuda|ggml_metal|vulkan|opencl|no\s+devices?|device\s+not\s+found|falling\s+back\s+to\s+cpu|cuda\s+error|metal\s+warning|warning:.*(?:gpu|cuda|metal|vulkan)/i;
  const fatalRe =
    /invalid argument|error:|fatal|failed to load|unable to load|could not|segmentation|panic/i;
  let gpuHits = 0;
  for (const line of lines) {
    if (fatalRe.test(line) && !gpuRe.test(line)) return false;
    if (gpuRe.test(line)) gpuHits += 1;
  }
  return gpuHits > 0 && gpuHits === lines.length;
}

/**
 * Decide whether a llama.cpp process failure should be treated as hard error.
 * GPU-only warnings alone must not fail when stdout has content OR stderr is GPU-only.
 */
export function shouldFailLlamaExit(
  code: number | null,
  stdout: string,
  stderr: string,
): boolean {
  if (code === 0 || code === null) return false;
  if (stdout.trim()) return false;
  if (isGpuWarningOnly(stderr)) return false;
  return true;
}
