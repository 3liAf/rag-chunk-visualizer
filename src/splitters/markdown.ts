import { ChunkResult, SplitterConfig } from '../types.js';
import { CHUNK_COLORS, detectSentenceFracture, estimateTokenCount } from './analyzer.js';
import { splitTextRecursive } from './recursive.js';

/**
 * Markdown-aware text splitter.
 * Detects Markdown headers (#, ##, ###, ####) to keep logical sections coherent.
 * When a section exceeds the configured chunk size, it delegates to recursive splitting.
 */
export function splitTextMarkdown(text: string, config: SplitterConfig): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  const chunkSize = Math.max(20, config.chunkSize);
  const chunkOverlap = Math.min(Math.max(0, config.chunkOverlap), chunkSize - 10);

  // Split by markdown headers while keeping headers intact
  const headerRegex = /(^|\n)(#{1,6}\s+[^\n]+)/g;
  const sections: { title: string; content: string; charStart: number }[] = [];

  let lastIndex = 0;
  let currentTitle = 'Introduction';
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(text)) !== null) {
    const matchStart = match.index + (match[1] ? match[1].length : 0);
    if (matchStart > lastIndex) {
      const piece = text.slice(lastIndex, matchStart);
      if (piece.trim().length > 0) {
        sections.push({
          title: currentTitle,
          content: piece,
          charStart: lastIndex
        });
      }
    }
    currentTitle = match[2].trim();
    lastIndex = matchStart;
  }

  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining.trim().length > 0) {
      sections.push({
        title: currentTitle,
        content: remaining,
        charStart: lastIndex
      });
    }
  }

  // If no markdown headers were found, fall back to recursive
  if (sections.length <= 1 && !headerRegex.test(text)) {
    return splitTextRecursive(text, config);
  }

  const rawChunks: { text: string; charStart: number }[] = [];

  for (const section of sections) {
    if (section.content.length <= chunkSize) {
      rawChunks.push({
        text: section.content,
        charStart: section.charStart
      });
    } else {
      // Subdivide oversized section using recursive splitter
      const subChunks = splitTextRecursive(section.content, {
        ...config,
        chunkSize,
        chunkOverlap
      });
      for (const sub of subChunks) {
        rawChunks.push({
          text: sub.text,
          charStart: section.charStart + sub.charStart
        });
      }
    }
  }

  // Deduplicate and assemble ChunkResults
  const results: ChunkResult[] = [];
  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const chunkText = chunk.text;
    const charStart = chunk.charStart;
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
      id: `chunk-${i + 1}`,
      index: i + 1,
      text: chunkText,
      charStart,
      charEnd,
      tokenCount: estimateTokenCount(chunkText),
      overlapWithPrevious,
      overlapCharLength,
      isFracturedSentence: isFractured,
      color: CHUNK_COLORS[i % CHUNK_COLORS.length]
    });
  }

  return results;
}
