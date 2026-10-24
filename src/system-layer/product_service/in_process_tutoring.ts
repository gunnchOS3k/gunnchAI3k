/**
 * Grounded tutoring without a model load and without a listening port.
 * Lesson text comes from lesson.md. Grade and completion fields are removed.
 */

import {
  composeLearnerAnswer,
  defaultLessonRoots,
  matchAuthorizedLesson,
  tutoringCitations,
} from '../local_inference/authorized_lessons';
import { suggestionOnlyTutoring } from './suggestion_only';

export function assistGroundedTutoring(
  query: string,
  options?: { roots?: string[]; env?: NodeJS.ProcessEnv },
) {
  const roots = options?.roots ?? defaultLessonRoots(options?.env ?? process.env);
  const lesson = matchAuthorizedLesson(query, roots);
  const answer = composeLearnerAnswer({ query, modelText: '', lesson });
  return suggestionOnlyTutoring({
    ok: true,
    capability: 'tutoring' as const,
    text: answer.text,
    structured: {
      answerKind: answer.kind,
      modelCompletion: '',
      sourceExcerpt: lesson?.excerpt ?? null,
      realInference: false,
    },
    provenance: {
      grounded: answer.grounded,
      realInference: false,
      backend: 'authorized-lesson',
      sources: answer.sources.map((id) => ({ id })),
    },
    citations: tutoringCitations(answer),
  });
}

const invoked = process.argv[1]?.includes('in_process_tutoring') === true;
if (invoked) {
  const queryFlag = process.argv.indexOf('--query');
  const query = queryFlag >= 0 ? process.argv[queryFlag + 1] ?? '' : '';
  process.stdout.write(JSON.stringify(assistGroundedTutoring(query)));
}
