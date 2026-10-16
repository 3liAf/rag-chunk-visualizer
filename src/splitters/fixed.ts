import { ChunkResult, SplitterConfig } from '../types.js';
import { CHUNK_COLORS, detectSentenceFracture, estimateTokenCount } from './analyzer.js';

/**
 * Fixed-size sliding window text splitter.
 * Moves through text strictly by character length with exact overlap offset.
 * Serves as the classic baseline for comparing against semantic/recursive splitters.
 */
export function splitTextFixed(text: string, config: SplitterConfig): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  const chunkSize = Math.max(20, config.chunkSize);
  const chunkOverlap = Math.min(Math.max(0, config.chunkOverlap), chunkSize - 5);
  const step = Math.max(1, chunkSize - chunkOverlap);

  const results: ChunkResult[] = [];
  let chunkIdx = 0;
  let charStart = 0;

  while (charStart < text.length) {
    const charEnd = Math.min(text.length, charStart + chunkSize);
    const chunkText = text.slice(charStart, charEnd);

    let overlapWithPrevious = '';
    let overlapCharLength = 0;
    if (results.length > 0) {
      const prev = results[results.length - 1];
      if (charStart < prev.charEnd) {
        overlapCharLength = prev.charEnd - charStart;
        overlapWithPrevious = text.slice(charStart, prev.charEnd);
      }
    }

    const isFractured = detectSentenceFracture(text, charStart, charEnd);

    results.push({
      id: `chunk-${chunkIdx + 1}`,
      index: chunkIdx + 1,
      text: chunkText,
      charStart,
      charEnd,
      tokenCount: estimateTokenCount(chunkText),
      overlapWithPrevious,
      overlapCharLength,
      isFracturedSentence: isFractured,
      color: CHUNK_COLORS[chunkIdx % CHUNK_COLORS.length]
    });

    chunkIdx++;
    if (charEnd >= text.length) {
      break;
    }
    charStart += step;
  }

  return results;
}
