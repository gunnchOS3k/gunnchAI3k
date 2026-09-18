export interface ContextChunk {
  id: string;
  text: string;
  tokens: number;
  priority: number;
  source: string;
  trust: 'trusted' | 'untrusted';
}

export interface ContextManagerMetrics {
  input_tokens: number;
  kept_tokens: number;
  dropped_chunks: number;
  compression_ratio: number;
  technique: string;
}

export type ContextTechnique = 'truncate_tail' | 'priority_pack' | 'summarize_low_priority' | 'dedupe';

export class ContextManagerV2 {
  pack(
    chunks: ContextChunk[],
    maxTokens: number,
    technique: ContextTechnique = 'priority_pack',
  ): { kept: ContextChunk[]; metrics: ContextManagerMetrics } {
    const input = chunks.reduce((s, c) => s + c.tokens, 0);
    let working = [...chunks];
    if (technique === 'dedupe') {
      const seen = new Set<string>();
      working = working.filter((c) => {
        const k = c.text.trim();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    if (technique === 'summarize_low_priority') {
      working = working.map((c) =>
        c.priority < 0.3
          ? { ...c, text: c.text.slice(0, 80) + '…', tokens: Math.min(c.tokens, 20) }
          : c,
      );
    }
    working.sort((a, b) => b.priority - a.priority);
    if (technique === 'truncate_tail') {
      working = [...chunks];
    }
    const kept: ContextChunk[] = [];
    let tokens = 0;
    for (const c of working) {
      if (tokens + c.tokens > maxTokens) continue;
      kept.push(c);
      tokens += c.tokens;
    }
    return {
      kept,
      metrics: {
        input_tokens: input,
        kept_tokens: tokens,
        dropped_chunks: chunks.length - kept.length,
        compression_ratio: input === 0 ? 1 : tokens / input,
        technique,
      },
    };
  }
}
