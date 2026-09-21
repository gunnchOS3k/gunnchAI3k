import {
  buildLlamaInvocation,
} from '../src/system-layer/local_inference/llamacpp_cli_compat';

const modernCliHelp = [
  '-st, --single-turn',
  '--simple-io',
  '--no-warmup',
  '--log-disable',
].join('\n');

const invModern = buildLlamaInvocation({
  binary: '/opt/homebrew/bin/llama-cli',
  modelPath: '/tmp/model.gguf',
  prompt: 'ping',
  nPredict: 8,
  ctx: 256,
  conversationMode: 'disabled',
  helpTextOverride: modernCliHelp,
  versionOverride: 'tip-cli-simulated',
});

const invLegacy = buildLlamaInvocation({
  binary: '/opt/homebrew/bin/llama-cli',
  modelPath: '/tmp/model.gguf',
  prompt: 'ping',
  nPredict: 8,
  ctx: 256,
  conversationMode: 'disabled',
});

console.log(
  JSON.stringify(
    {
      modernSimulatedArgs: invModern.args,
      modernConversationFlag: invModern.conversationFlag,
      modernNotes: invModern.notes,
      liveBinary: invLegacy.binary,
      liveArgs: invLegacy.args,
      liveConversationFlag: invLegacy.conversationFlag,
      liveNotes: invLegacy.notes,
      liveVersion: invLegacy.capability.version,
      liveSupportsNoCnv: invLegacy.capability.supportsNoCnv,
    },
    null,
    2,
  ),
);
