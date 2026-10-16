import { ChunkResult, SplitterConfig } from '../types.js';
import { CHUNK_COLORS, detectSentenceFracture, estimateTokenCount } from './analyzer.js';

export function splitTextSentence(text: string, config: SplitterConfig): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  const chunkSize = Math.max(20, config.chunkSize);
  const chunkOverlap = Math.min(Math.max(0, config.chunkOverlap), chunkSize - 10);

  // Regex splitting by sentence boundaries preserving delimiters
  const sentenceRegex = /([^.!?\n]+[.!?\n]+|\S+)/g;
  const sentences: string[] = text.match(sentenceRegex) || [text];

  const results: ChunkResult[] = [];
  let currentChunkSentences: string[] = [];
  let currentLength = 0;
  let chunkIdx = 0;

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    if (currentLength + s.length > chunkSize && currentChunkSentences.length > 0) {
      const chunkText = currentChunkSentences.join('');
      const charStart = text.indexOf(chunkText);
      const charEnd = charStart + chunkText.length;

      let overlapWithPrevious = '';
      let overlapCharLength = 0;
      if (results.length > 0) {
        const prev = results[results.length - 1];
        if (charStart < prev.charEnd) {
          overlapCharLength = Math.max(0, prev.charEnd - charStart);
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

      // Retain sentences that fit into overlap budget
      let overlapSentences: string[] = [];
      let overlapLen = 0;
      for (let j = currentChunkSentences.length - 1; j >= 0; j--) {
        const candidate = currentChunkSentences[j];
        if (overlapLen + candidate.length <= chunkOverlap) {
          overlapSentences.unshift(candidate);
          overlapLen += candidate.length;
        } else {
          break;
        }
      }

      currentChunkSentences = [...overlapSentences];
      currentLength = overlapLen;
    }

    currentChunkSentences.push(s);
    currentLength += s.length;
  }

  if (currentChunkSentences.length > 0) {
    const chunkText = currentChunkSentences.join('');
    const charStart = text.lastIndexOf(chunkText);
    const charEnd = charStart + chunkText.length;

    let overlapWithPrevious = '';
    let overlapCharLength = 0;
    if (results.length > 0) {
      const prev = results[results.length - 1];
      if (charStart < prev.charEnd) {
        overlapCharLength = Math.max(0, prev.charEnd - charStart);
        overlapWithPrevious = text.slice(charStart, prev.charEnd);
      }
    }

    results.push({
      id: `chunk-${chunkIdx + 1}`,
      index: chunkIdx + 1,
      text: chunkText,
      charStart,
      charEnd,
      tokenCount: estimateTokenCount(chunkText),
      overlapWithPrevious,
      overlapCharLength,
      isFracturedSentence: detectSentenceFracture(text, charStart, charEnd),
      color: CHUNK_COLORS[chunkIdx % CHUNK_COLORS.length]
    });
  }

  return results;
}
