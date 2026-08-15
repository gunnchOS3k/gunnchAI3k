/**
 * Final-answer-only MCQ choice parser for Mastery-002.
 * Never consults gold keys / grader feedback. Extracts declared final response only.
 * Parser version bumped when behavior changes — do not silently rewrite history.
 */
export const CHOICE_PARSER_VERSION = 'gunnchai.choice_parser.v2_final_only';

export interface ParseChoiceResult {
  index: number | null;
  letter: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matched_via: string | null;
  parser_version: typeof CHOICE_PARSER_VERSION;
}

const LETTER_RE = '([A-Da-d])';

/** Strip echoed prompt scaffolding so A/B/C/D instructions / option lists cannot leak as answers. */
function stripPromptEcho(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n');
  // Drop common llama.cpp wrapper prefixes
  t = t.replace(/^\[llama\.cpp[^\]]*\][^\n]*\n?/i, '');
  t = t.replace(/^Capability:[^\n]*\n?/gim, '');
  t = t.replace(/^Query:[^\n]*\n?/gim, '');
  // Remove bare instruction lines that list A/B/C/D
  t = t.replace(/Reply with a single letter\s*\(A\/B\/C\/D\)\s*only\.?/gi, '');
  t = t.replace(/\b[A-D]\s*\/\s*[A-D]\s*\/\s*[A-D]\s*\/\s*[A-D]\b/gi, '');

  // If the model echoed Question + option list, keep ONLY text after the option block
  const qIdx = t.lastIndexOf('Question:');
  if (qIdx >= 0) {
    const afterQ = t.slice(qIdx);
    const lines = afterQ.split('\n');
    let lastOption = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (/^\s*[A-D]\)\s*/i.test(lines[i])) lastOption = i;
    }
    if (lastOption >= 0) {
      const after = lines.slice(lastOption + 1).join('\n').trim();
      t = after; // may be empty → no declared final answer
    }
  } else {
    // Still drop standalone option-list lines if present without Question:
    t = t
      .split('\n')
      .filter((line) => !/^\s*[A-D]\)\s+\S/i.test(line))
      .join('\n');
  }
  return t.trim();
}

function letterToIndex(letter: string, n: number): number | null {
  const i = letter.toUpperCase().charCodeAt(0) - 65;
  return i >= 0 && i < n ? i : null;
}

function fromMatch(
  letter: string,
  n: number,
  via: string,
  confidence: ParseChoiceResult['confidence'],
): ParseChoiceResult {
  const index = letterToIndex(letter, n);
  return {
    index,
    letter: index == null ? null : letter.toUpperCase(),
    confidence: index == null ? 'none' : confidence,
    matched_via: index == null ? null : via,
    parser_version: CHOICE_PARSER_VERSION,
  };
}

/**
 * Extract declared final MCQ response from model output.
 * Priority: explicit final/answer markers (last wins) → JSON → trailing lone letter.
 * Never uses gold answers.
 */
export function parseFinalChoice(raw: string, nChoices = 4): ParseChoiceResult {
  const n = Math.max(1, Math.min(nChoices, 26));
  const text = stripPromptEcho(raw || '');
  if (!text) {
    return {
      index: null,
      letter: null,
      confidence: 'none',
      matched_via: null,
      parser_version: CHOICE_PARSER_VERSION,
    };
  }

  const patterns: Array<{ re: RegExp; via: string; confidence: ParseChoiceResult['confidence'] }> = [
    // last explicit final / answer declarations (last match wins)
    {
      re: new RegExp(
        `(?:final\\s*(?:answer|choice|response)?|answer|choice|response|conclude[sd]?|therefore|thus)\\s*[:\\-]?\\s*(?:is\\s+|option\\s+|letter\\s+)?(?:\\()?${LETTER_RE}(?:\\))?\\b`,
        'gi',
      ),
      via: 'final_marker',
      confidence: 'high',
    },
    {
      re: new RegExp(
        `\\b(?:choose|chooses|chose|pick|picks|picked|select|selects|selected)\\s+(?:option\\s+|letter\\s+)?(?:\\()?${LETTER_RE}(?:\\))?\\b`,
        'gi',
      ),
      via: 'choose_pick',
      confidence: 'high',
    },
    {
      re: new RegExp(`\\bnot\\s+[A-D]\\s*[;,]\\s*${LETTER_RE}\\b`, 'gi'),
      via: 'not_x_semicolon',
      confidence: 'high',
    },
    {
      re: new RegExp(`\\{\\s*["']?(?:answer|choice|final)["']?\\s*:\\s*["']?${LETTER_RE}["']?\\s*\\}`, 'gi'),
      via: 'json_object',
      confidence: 'high',
    },
    {
      re: new RegExp(`\\boption\\s+${LETTER_RE}\\b`, 'gi'),
      via: 'option_letter',
      confidence: 'medium',
    },
    {
      re: new RegExp(`\\(${LETTER_RE}\\)`, 'gi'),
      via: 'paren_letter',
      confidence: 'medium',
    },
  ];

  for (const p of patterns) {
    let last: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;
    const re = new RegExp(p.re.source, p.re.flags);
    while ((m = re.exec(text)) !== null) last = m;
    if (last) {
      const hit = fromMatch(last[1], n, p.via, p.confidence);
      if (hit.index != null) return hit;
    }
  }

  // Multiline: last non-empty line that is primarily a letter
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const lone = new RegExp(`^(?:answer\\s*[:=]\\s*)?(?:option\\s+)?(?:\\(?${LETTER_RE}\\)?)[.!]?$`, 'i').exec(
      line,
    );
    if (lone) {
      const hit = fromMatch(lone[1], n, 'trailing_lone_letter', 'high');
      if (hit.index != null) return hit;
    }
  }

  // Unicode fullwidth letters Ａ–Ｄ
  const fw = /[Ａ-Ｄ]/.exec(text);
  if (fw) {
    const mapped = String.fromCharCode(fw[0].charCodeAt(0) - 0xff01 + 33);
    // Prefer last fullwidth
    let lastFw: string | null = null;
    for (const ch of text) {
      if (ch >= 'Ａ' && ch <= 'Ｄ') lastFw = String.fromCharCode(ch.charCodeAt(0) - 0xff01 + 33);
    }
    if (lastFw) {
      const hit = fromMatch(lastFw, n, 'unicode_fullwidth', 'medium');
      if (hit.index != null) return hit;
    }
    void mapped;
  }

  // Last resort: last standalone letter NOT inside A/B/C/D slash lists (already stripped)
  // and not as part of words — scan from end
  const standalone = [...text.matchAll(new RegExp(`(?:^|[^A-Za-z0-9_])${LETTER_RE}(?![A-Za-z0-9_])`, 'g'))];
  if (standalone.length) {
    const last = standalone[standalone.length - 1];
    const hit = fromMatch(last[1], n, 'last_standalone_letter', 'low');
    if (hit.index != null) return hit;
  }

  return {
    index: null,
    letter: null,
    confidence: 'none',
    matched_via: null,
    parser_version: CHOICE_PARSER_VERSION,
  };
}

/** @deprecated alias — use parseFinalChoice */
export function parseChoiceIndex(text: string, n: number): number | null {
  return parseFinalChoice(text, n).index;
}
