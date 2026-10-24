import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  composeLearnerAnswer,
  matchAuthorizedLesson,
  tutoringCitations,
} from '../../src/system-layer/local_inference/authorized_lessons';
import {
  attributionForCompletedRun,
  completionAfterPrompt,
  DEFAULT_N_PREDICT,
  learnerCompletionFromStdout,
  learnerFacingText,
  truthfulModelId,
} from '../../src/system-layer/local_inference/backends/llamacpp';
import { relevantContext } from '../../src/system-layer/local_inference/runtime_adapter';
import { evaluateCloudDisclosure } from '../../src/system-layer/privacy_policy';
import { suggestionOnlyTutoring } from '../../src/system-layer/product_service/suggestion_only';
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

  it('returns empty when the completion is missing instead of banner text', () => {
    const prompt = 'You are gunnchAI3k local offline assistant.\nQuery: Say hello in one sentence.';
    const stdout = [
      '▄▄▄▄▄▄',
      'build: b1234',
      'model: SmolLM2-135M',
      'Loading model',
      `> ${prompt}`,
      '[ Prompt: 10.0 t/s | Generation: 0.0 t/s ]',
      'Exiting...',
    ].join('\n');
    assert.equal(learnerCompletionFromStdout(stdout, prompt), '');
    assert.equal(learnerCompletionFromStdout('build: b1234\nmodel: SmolLM2\nLoading model\n', prompt), '');
  });

  it('keeps a short answer and a partial prompt echo out of the learner text', () => {
    const prompt = [
      'You are gunnchAI3k local offline assistant.',
      'Capability: tutoring',
      'Query: Say hello in one sentence.',
      'Respond with concise, actionable local guidance. Do not invent cloud calls.',
    ].join('\n');
    const partial = [
      'llama.cpp console',
      '> You are gunnchAI3k local offline assistant.',
      'Capability: tutoring',
      'Query: Say hello in one sentence.',
      'Respond with concise, actionable local guidance. Do not invent clo',
      'Hi.',
      '[ Prompt: 140.6 t/s | Generation: 268.8 t/s ]',
      'Exiting...',
    ].join('\n');
    assert.equal(learnerCompletionFromStdout(partial, prompt), 'Hi.');
    const short = '> Say hello in one sentence.\nHi\n[ Prompt: 10.0 t/s | Generation: 20.0 t/s ]\n';
    assert.equal(completionAfterPrompt(short, 'Say hello in one sentence.'), 'Hi');
    assert.equal(learnerCompletionFromStdout(short, 'Say hello in one sentence.'), 'Hi');
  });

  it('reads an ordinary llama.cpp console without keeping the prompt', () => {
    const prompt = 'Say hello in one sentence.';
    const stdout = [
      '█ banner',
      'build: cb26014d9',
      'model: SmolLM2',
      `> ${prompt}`,
      'Hello!',
      '',
      '[ Prompt: 140.6 t/s | Generation: 268.8 t/s ]',
      'Exiting...',
    ].join('\n');
    assert.equal(learnerCompletionFromStdout(stdout, prompt), 'Hello!');
  });

  it('does not match a short token inside a longer unrelated word', () => {
    const program = {
      id: 'waike:curriculum/programs.md',
      text: 'A program is a set of instructions.',
    };
    const profile = {
      id: 'local-runtime:fixtures/local-runtime/documents/device-help.md',
      text: 'Confirm the device profile before continuing.',
    };
    const ramLesson = {
      id: 'waike:curriculum/memory.md',
      text: 'RAM holds the data the computer is using right now.',
    };
    assert.equal(relevantContext('Explain RAM in one sentence.', [program]), undefined);
    assert.equal(
      relevantContext('Explain a file extension in one sentence.', [profile]),
      undefined,
    );
    assert.deepEqual(
      relevantContext('Explain RAM in one sentence.', [program, ramLesson])?.map((hit) => hit.id),
      ['waike:curriculum/memory.md'],
    );
  });

  it('keeps a real llama.cpp run labeled llama.cpp when the completion is empty', () => {
    const ran = attributionForCompletedRun('');
    assert.equal(ran.text, '');
    assert.equal(ran.backend, 'llama.cpp');
    assert.equal(ran.realInference, true);
    assert.equal(ran.isTrainedLlm, true);
    assert.equal(ran.grounded, false);
    assert.equal(truthfulModelId(ran.isTrainedLlm), 'llama.cpp');
    assert.equal(ran.text.includes('TUTORING['), false);
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

  it('matches a lesson paragraph and ignores fixtures, substrings, and split topics', () => {
    const root = mkdtempSync(join(tmpdir(), 'waike-lessons-'));
    const confidence = join(root, 'digital_rc', 'DIGITAL_CONFIDENCE', 'weeks', 'w01');
    const hardware = join(root, 'digital_rc', 'DIGITAL_CONFIDENCE', 'weeks', 'w06');
    const noise = join(root, 'knowledge');
    mkdirSync(confidence, { recursive: true });
    mkdirSync(hardware, { recursive: true });
    mkdirSync(noise, { recursive: true });
    writeFileSync(
      join(confidence, 'lesson.md'),
      [
        'Week 1 names three jobs.',
        '',
        'Guided practice: save essay.txt in a folder you own, close the editor, and reopen the file.',
        '',
        'A file extension is the suffix after the last dot in a file name.',
      ].join('\n'),
    );
    writeFileSync(
      join(hardware, 'lesson.md'),
      [
        'Count RAM in the firmware screen.',
        '',
        'CPU observations belong in a different note.',
        '',
        'RAM holds working data and the CPU executes instructions.',
      ].join('\n'),
    );
    writeFileSync(
      join(noise, 'skill_tree.yaml'),
      'digital confidence file practical\n',
    );
    writeFileSync(
      join(noise, 'lesson.md'),
      'A program stores a profile. This paragraph is a program profile.',
    );

    const extension = matchAuthorizedLesson(
      'Explain a file extension in one sentence.',
      [root],
    );
    assert.equal(extension?.excerpt.includes('suffix after the last dot'), true);
    assert.equal(extension?.id.includes('w01'), true);

    const practical = matchAuthorizedLesson(
      'Help me with the Digital Confidence file practical.',
      [root],
    );
    assert.equal(practical?.excerpt.includes('essay.txt'), true);
    assert.equal(practical?.excerpt.includes('skill_tree'), false);

    const contrast = matchAuthorizedLesson('Explain CPU versus RAM.', [root]);
    assert.equal(contrast?.excerpt.includes('CPU executes'), true);
    assert.equal(contrast?.excerpt.includes('firmware'), false);

    assert.equal(
      matchAuthorizedLesson('Explain RAM in one sentence.', [
        join(noise),
      ]),
      null,
    );
    assert.equal(matchAuthorizedLesson('Say hello in one sentence.', [root]), null);
  });

  it('keeps model text out of a source answer and abstains on an unsourced number', () => {
    const lesson = {
      id: 'waike:digital_rc/DIGITAL_CONFIDENCE/weeks/w01/lesson.md',
      sourcePath: 'lesson.md',
      excerpt: 'Save essay.txt and reopen the file.',
    };
    const grounded = composeLearnerAnswer({
      query: 'Help me with the Digital Confidence file practical.',
      modelText: 'Digital Confidence and Computer Basics\n\nIntroduction',
      lesson,
    });
    assert.equal(grounded.kind, 'source-backed');
    assert.equal(grounded.grounded, true);
    assert.equal(grounded.text.includes('essay.txt'), true);
    assert.equal(grounded.text.includes('Introduction'), false);
    assert.deepEqual(grounded.sources, [lesson.id]);

    const model = composeLearnerAnswer({
      query: 'Explain a variable in one sentence.',
      modelText: 'A variable stores a value.',
      lesson: null,
    });
    assert.equal(model.kind, 'model-completion');
    assert.equal(model.text, 'A variable stores a value.');
    assert.equal(model.grounded, false);

    const abstain = composeLearnerAnswer({
      query: 'What is the boiling point of tungsten?',
      modelText: 'The boiling point of tungsten is approximately 3523 degrees Celsius.',
      lesson: null,
    });
    assert.equal(abstain.kind, 'abstain');
    assert.equal(abstain.text.includes('3523'), false);
    assert.equal(/\d/.test(abstain.text), false);
    const cites = tutoringCitations(abstain);
    assert.equal(cites.length, 1);
    assert.equal(cites[0]?.source, 'local:no-authorized-lesson');
    assert.equal(cites[0]?.source.includes('SHARED_CONTENT'), false);
    const lessonCites = tutoringCitations(grounded);
    assert.equal(lessonCites[0]?.source, lesson.id);
    assert.equal(lessonCites[0]?.snippet.includes('Introduction'), false);
  });

  it('keeps a suggestion-only tutoring response free of grade and completion fields', () => {
    const response = suggestionOnlyTutoring({
      capability: 'tutoring',
      text: 'Source: lesson',
      grade: { points: 10 },
      completion: { established: true },
      structured: {
        answerKind: 'source-backed',
        modelCompletion: 'model text stays separate',
        grade: 1,
        completion: 'done',
      },
    });
    assert.equal(response.suggestion_only, true);
    assert.equal(Object.hasOwn(response, 'grade'), false);
    assert.equal(Object.hasOwn(response, 'completion'), false);
    assert.equal(Object.hasOwn(response.structured, 'grade'), false);
    assert.equal(Object.hasOwn(response.structured, 'completion'), false);
    assert.equal(response.structured.modelCompletion, 'model text stays separate');
    assert.equal(
      source('src/system-layer/product_service/service.ts').includes('suggestionOnlyTutoring'),
      true,
    );
  });

  it('drops nested and malformed grade or completion values from a suggestion-only tutoring response', () => {
    const response = suggestionOnlyTutoring({
      capability: 'tutoring',
      text: '{"grade":{"points":10},"completion":{"established":true},"note":"lesson"}',
      extra: { grade: { points: 9 }, keep: 'visible', nested: { completion: true } },
      citations: [{ source: 'lesson', grade: 1, completion: 'done' }],
      structured: {
        answerKind: 'source-backed',
        modelCompletion: 'model text stays separate',
        wrapped: { grade: 1, completion: 'done', source: 'lesson' },
        encoded: '{"completion":{"established":true},"grade":4,"keep":"excerpt"}',
        malformed: '{"grade":',
      },
    });
    assert.equal(response.suggestion_only, true);
    assert.equal(response.structured.modelCompletion, 'model text stays separate');
    assert.equal(response.extra.keep, 'visible');
    assert.equal(response.structured.wrapped.source, 'lesson');
    assert.equal(response.citations[0]?.source, 'lesson');
    assert.equal(JSON.parse(response.text).note, 'lesson');
    assert.equal(JSON.parse(response.structured.encoded).keep, 'excerpt');
    assert.equal(response.structured.malformed, '');
    const flat = JSON.stringify(response);
    assert.equal(flat.includes('"grade"'), false);
    assert.equal(flat.includes('"completion"'), false);
  });

  it('asks llama.cpp for more than 64 tokens and does not feed fixture hits to tutoring', () => {
    assert.equal(DEFAULT_N_PREDICT > 64, true);
    const adapter = source('src/system-layer/local_inference/runtime_adapter.ts');
    const tutoring = adapter.slice(
      adapter.indexOf('hybrid / llm'),
      adapter.indexOf('private async inferWithLocalRag'),
    );
    assert.equal(tutoring.includes('contextDocs'), false);
    assert.equal(tutoring.includes('modelCompletion'), true);
    assert.equal(source('src/system-layer/product_service/service.ts').includes('tutoringCitations'), true);
    assert.equal(source('src/system-layer/product_service/server.ts').includes(PRODUCT_SERVICE_BIND_HOST), true);
  });
});
