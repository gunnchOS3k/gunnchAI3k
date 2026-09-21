import {
  buildLlamaInvocation,
  clearLlamaCliCompatCache,
  isGpuWarningOnly,
  parseLlamaCapability,
  selectConversationFlags,
  shouldFailLlamaExit,
} from '../../src/system-layer/local_inference/llamacpp_cli_compat';

const LEGACY_HELP = `
-cnv,  --conversation, -no-cnv, --no-conversation
                                        whether to run in conversation mode
-st,   --single-turn                    run conversation for a single turn only
--simple-io                             use basic IO
--no-warmup                             whether to perform warmup
--log-disable                           Log disable
`;

/** Tip llama-cli: -no-cnv is completion-only (absent from CLI help). */
const MODERN_CLI_HELP = `
-st,   --single-turn                    run conversation for a single turn only
--simple-io                             use basic IO
--no-warmup                             whether to perform warmup
--log-disable                           Log disable
`;

const MODERN_COMPLETION_HELP = `
-cnv,  --conversation, -no-cnv, --no-conversation
                                        whether to run in conversation mode
-st,   --single-turn                    run conversation for a single turn only
--simple-io                             use basic IO
--no-warmup                             whether to perform warmup
--log-disable                           Log disable
`;

describe('llamacpp_cli_compat capability adapter', () => {
  beforeEach(() => {
    clearLlamaCliCompatCache();
  });

  it('legacy path keeps -no-cnv for disable-conversation intent', () => {
    const inv = buildLlamaInvocation({
      binary: '/fake/llama-cli',
      modelPath: '/m.gguf',
      prompt: 'hi',
      nPredict: 8,
      ctx: 256,
      conversationMode: 'disabled',
      helpTextOverride: LEGACY_HELP,
      versionOverride: 'version: 10310 (legacy)',
    });
    expect(inv.args).toContain('-no-cnv');
    expect(inv.args).toContain('-st');
    expect(inv.conversationFlag).toBe('-no-cnv');
    expect(inv.conversationModeApplied).toBe('disabled');
  });

  it('modern llama-cli without -no-cnv maps to single-turn (does not silently drop intent)', () => {
    const cap = parseLlamaCapability('/fake/llama-cli', MODERN_CLI_HELP, 'tip');
    expect(cap.supportsNoCnv).toBe(false);
    expect(cap.supportsSingleTurn).toBe(true);
    const sel = selectConversationFlags(cap, 'disabled');
    expect(sel.applied).toBe('disabled');
    expect(sel.flags).toContain('-st');
    expect(sel.notes).toContain('MAPPED_NO_CNV_TO_SINGLE_TURN');

    const inv = buildLlamaInvocation({
      binary: '/fake/llama-cli',
      modelPath: '/m.gguf',
      prompt: 'hi',
      nPredict: 8,
      ctx: 256,
      conversationMode: 'disabled',
      helpTextOverride: MODERN_CLI_HELP,
      versionOverride: 'version: tip-cli',
    });
    expect(inv.args).not.toContain('-no-cnv');
    expect(inv.args).toContain('-st');
    expect(inv.conversationModeApplied).toBe('disabled');
  });

  it('modern completion binary retains -no-cnv and skips --log-disable', () => {
    const inv = buildLlamaInvocation({
      binary: '/fake/llama-completion',
      modelPath: '/m.gguf',
      prompt: 'hi',
      nPredict: 8,
      ctx: 256,
      conversationMode: 'disabled',
      helpTextOverride: MODERN_COMPLETION_HELP,
      versionOverride: 'version: tip-completion',
    });
    expect(inv.args).toContain('-no-cnv');
    expect(inv.args).not.toContain('--log-disable');
    expect(inv.args).not.toContain('-st');
    expect(inv.capability.kind).toBe('llama-completion');
    expect(inv.notes).toContain('SKIPPED_LOG_DISABLE_ON_LLAMA_COMPLETION');
  });

  it('tip llama-cli without -no-cnv stays on cli with -st (does not prefer empty completion path)', () => {
    const inv = buildLlamaInvocation({
      binary: '/fake/llama-cli',
      modelPath: '/m.gguf',
      prompt: 'hi',
      nPredict: 8,
      ctx: 256,
      conversationMode: 'disabled',
      helpTextOverride: MODERN_CLI_HELP,
      versionOverride: 'tip-cli',
    });
    expect(inv.binary).toBe('/fake/llama-cli');
    expect(inv.args).toContain('-st');
    expect(inv.args).not.toContain('-no-cnv');
    expect(inv.notes).toContain('MAPPED_NO_CNV_TO_SINGLE_TURN');
  });

  it('unsupported optional flags are skipped without inventing invalid args', () => {
    const thinHelp = `-st, --single-turn\n`;
    const inv = buildLlamaInvocation({
      binary: '/fake/llama-cli',
      modelPath: '/m.gguf',
      prompt: 'hi',
      nPredict: 4,
      ctx: 128,
      conversationMode: 'disabled',
      helpTextOverride: thinHelp,
      versionOverride: 'thin',
    });
    expect(inv.args).not.toContain('--simple-io');
    expect(inv.args).not.toContain('--no-warmup');
    expect(inv.args).not.toContain('--log-disable');
    expect(inv.args).not.toContain('-no-cnv');
    expect(inv.notes.some((n) => n.startsWith('SKIPPED_UNSUPPORTED_FLAG:'))).toBe(true);
  });

  it('CPU-only CI path: ngl 0 is always emitted', () => {
    const inv = buildLlamaInvocation({
      binary: '/fake/llama-cli',
      modelPath: '/m.gguf',
      prompt: 'cpu',
      nPredict: 4,
      ctx: 128,
      ngl: 0,
      conversationMode: 'disabled',
      helpTextOverride: LEGACY_HELP,
      versionOverride: 'ci',
    });
    const nglIdx = inv.args.indexOf('-ngl');
    expect(nglIdx).toBeGreaterThanOrEqual(0);
    expect(inv.args[nglIdx + 1]).toBe('0');
  });

  it('GPU warning alone must not fail', () => {
    expect(isGpuWarningOnly('ggml_cuda: no devices found\nfalling back to CPU')).toBe(true);
    expect(shouldFailLlamaExit(1, '', 'Warning: GPU device not found')).toBe(false);
    expect(shouldFailLlamaExit(1, 'hello world', 'error: invalid argument: -no-cnv')).toBe(false);
    expect(shouldFailLlamaExit(1, '', 'error: invalid argument: -no-cnv')).toBe(true);
  });
});
