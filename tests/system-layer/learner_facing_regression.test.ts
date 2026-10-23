import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  completionAfterPrompt,
  learnerFacingText,
  truthfulModelId,
} from '../../src/system-layer/local_inference/backends/llamacpp';
import { relevantContext } from '../../src/system-layer/local_inference/runtime_adapter';
import { evaluateCloudDisclosure } from '../../src/system-layer/privacy_policy';
import { PRODUCT_SERVICE_BIND_HOST } from '../../src/system-layer/product_service/server';

const root = join(__dirname, '../..');

function source(relative: string): string {
  return readFileSync(join(root, relative), 'utf8');
}

describe('learner-facing prompt, scaffold, and retrieval', () => {
  it('does not treat an echoed multiline prompt as the learner-facing answer', () => {
    const prompt = [
      'You are gunnchAI3k local offline assistant.',
      'Capability: tutoring',
      'Query: Say hello in one sentence.',
      'Local context:',
      '[local-runtime:fixtures/local-runtime/documents/accessibility.md] Rewrite dense technical text into short sentences.',
      'Respond with concise, actionable local guidance. Do not invent cloud calls.',
    ].join('\n');
    const stdout = `\n> ${prompt}\nHello there.\n[ Prompt: 10.0 t/s | Generation: 20.0 t/s ]\nExiting...\n`;
    const text = completionAfterPrompt(stdout, prompt);
    assert.equal(text, 'Hello there.');
    assert.equal(text.includes('accessibility'), false);
    assert.equal(text.includes('Local context'), false);
    assert.equal(text.includes('Rewrite dense'), false);
  });

  it('does not paste the deterministic tutoring rubric into the learner-facing answer', () => {
    const scaffold = [
      'TUTORING[hello]',
      'Concept: hello',
      'Steps: Define hello in one sentence.',
      'Check: What is one property of hello?',
    ].join('\n');
    const text = learnerFacingText('Hello there.');
    assert.equal(text, 'Hello there.');
    assert.equal(text.includes(scaffold), false);
    assert.equal(text.includes('TUTORING['), false);
    assert.equal(
      source('src/system-layer/local_inference/backends/llamacpp.ts').includes(
        '[structured overlay]',
      ),
      false,
    );
  });

  it('excludes a fixture that shares only an ordinary word', () => {
    const accessibility = {
      id: 'local-runtime:fixtures/local-runtime/documents/accessibility.md',
      text: 'Rewrite dense technical text into short sentences.',
    };
    const deviceHelp = {
      id: 'local-runtime:fixtures/local-runtime/documents/device-help.md',
      text: 'Local Health Check. Confirm the device file and operating system.',
    };
    assert.equal(
      relevantContext('Say hello in one sentence.', [accessibility]),
      undefined,
    );
    assert.equal(
      relevantContext('Explain a file extension in one sentence.', [deviceHelp]),
      undefined,
    );
  });

  it('still retrieves a short learning query when the material matches its content words', () => {
    const lesson = {
      id: 'waike:curriculum/binary-search.md',
      text: 'Binary search finds an item by repeatedly halving a sorted list.',
    };
    const unrelated = {
      id: 'local-runtime:fixtures/local-runtime/documents/accessibility.md',
      text: 'Rewrite dense technical text into short sentences.',
    };
    const hits = relevantContext('Explain binary search in one sentence.', [
      unrelated,
      lesson,
    ]);
    assert.deepEqual(
      hits?.map((hit) => hit.id),
      ['waike:curriculum/binary-search.md'],
    );
  });

  it('keeps real inference labeled llama.cpp', () => {
    assert.equal(truthfulModelId(true), 'llama.cpp');
    assert.equal(truthfulModelId(false), 'deterministic-baseline');
    assert.equal(truthfulModelId(true).includes('360'), false);
    assert.equal(
      source('src/system-layer/product_service/service.ts').includes(
        'truthfulModelId(inference.isTrainedLlm)',
      ),
      true,
    );
  });

  it('keeps localhost binding, refuses TLS bypasses, and does not award grades', () => {
    assert.equal(PRODUCT_SERVICE_BIND_HOST, '127.0.0.1');
    const server = source('src/system-layer/product_service/server.ts');
    const cli = source('src/system-layer/product_service/cli.ts');
    const service = source('src/system-layer/product_service/service.ts');
    for (const text of [server, cli, service]) {
      assert.equal(text.includes('NODE_TLS_REJECT_UNAUTHORIZED'), false);
      assert.equal(text.includes('ignoreHTTPSErrors'), false);
      assert.equal(text.includes('--insecure'), false);
    }
    assert.equal(server.includes('awardGrade'), false);
    assert.equal(server.includes('/grade'), false);
    assert.equal(service.includes('awardGrade'), false);
    assert.equal(service.includes('completion_established'), false);
    assert.match(server, /app\.listen\(port, PRODUCT_SERVICE_BIND_HOST/);
  });

  it('keeps cloud processing disabled for local-only tutoring', () => {
    const decision = evaluateCloudDisclosure({
      processingMode: 'local-only',
      userCloudConsent: false,
      containsSensitiveLocalData: false,
      capability: 'tutoring',
    });
    assert.equal(decision.cloudPermitted, false);
    assert.equal(decision.dataLeavesDevice, false);
    assert.equal(decision.processingMode, 'local-only');
  });
});
