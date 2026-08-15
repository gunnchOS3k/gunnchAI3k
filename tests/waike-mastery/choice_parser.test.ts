/**
 * Adversarial corpus for final-answer-only choice parser.
 * Expected = declared final response only (never gold-key leakage).
 */
import { CHOICE_PARSER_VERSION, parseFinalChoice } from '../../src/waike-mastery/choice_parser';

const CASES: Array<{ id: string; raw: string; expect: string | null }> = [
  { id: 'bare_A', raw: 'A', expect: 'A' },
  { id: 'answer_colon_A', raw: 'Answer: A', expect: 'A' },
  { id: 'option_A', raw: 'I pick option A', expect: 'A' },
  { id: 'paren_A', raw: 'The correct one is (A)', expect: 'A' },
  { id: 'not_B_semicolon_A', raw: 'Not B;A', expect: 'A' },
  {
    id: 'multiline_final',
    raw: 'Maybe B looks tempting.\nStill unsure about A.\nFinal answer: C',
    expect: 'C',
  },
  { id: 'json_answer', raw: '{"answer":"B"}', expect: 'B' },
  { id: 'lowercase_c', raw: 'answer: c', expect: 'C' },
  { id: 'unicode_fullwidth', raw: '最終: Ｃ', expect: 'C' },
  {
    id: 'reasoning_mentions_ABCD_chooses_C',
    raw: 'A is wrong. B confuses the stem. D is unrelated. I choose C.',
    expect: 'C',
  },
  {
    id: 'changes_answer_at_end',
    raw: 'At first I thought A.\nOn second thought B.\nFinal answer: D',
    expect: 'D',
  },
  {
    id: 'first_A_final_B',
    raw: 'first A final B',
    expect: 'B',
  },
  {
    id: 'prompt_echo_ABCD_must_not_leak',
    raw:
      '[llama.cpp REAL local inference]\n' +
      'Capability: waike-mastery-mcq\n' +
      'Query: Reply with a single letter (A/B/C/D) only.\n' +
      'Question: What is RAM?\n' +
      'A) disk\nB) memory\nC) cpu\nD) gpu\n' +
      'Final: B',
    expect: 'B',
  },
  {
    id: 'prompt_echo_only_no_answer',
    raw:
      'Reply with a single letter (A/B/C/D) only.\n' +
      'Question: demo\nA) x\nB) y\nC) z\nD) w',
    expect: null,
  },
  {
    id: 'json_final_field',
    raw: 'Thinking...\n{"final":"D"}',
    expect: 'D',
  },
];

describe('choice_parser adversarial corpus', () => {
  it('uses final-only parser version', () => {
    expect(CHOICE_PARSER_VERSION).toContain('final_only');
  });

  for (const c of CASES) {
    it(`${c.id} → ${c.expect ?? 'null'}`, () => {
      const got = parseFinalChoice(c.raw, 4);
      expect(got.letter).toBe(c.expect);
      if (c.expect != null) {
        expect(got.index).toBe(c.expect.charCodeAt(0) - 65);
        expect(got.confidence).not.toBe('none');
      } else {
        expect(got.index).toBeNull();
      }
    });
  }

  it('never reads gold keys (API has no gold parameter)', () => {
    // Type/API contract: parseFinalChoice(raw, n) only.
    const fn = parseFinalChoice as (raw: string, n?: number) => unknown;
    expect(fn.length).toBeLessThanOrEqual(2);
  });
});
