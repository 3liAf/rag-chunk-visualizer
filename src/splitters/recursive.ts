import { ChunkResult, SplitterConfig } from '../types.js';
import { CHUNK_COLORS, detectSentenceFracture, estimateTokenCount } from './analyzer.js';

export function splitTextRecursive(text: string, config: SplitterConfig): ChunkResult[] {
  if (!text || text.trim().length === 0) return [];

  const chunkSize = Math.max(20, config.chunkSize);
  const chunkOverlap = Math.min(Math.max(0, config.chunkOverlap), chunkSize - 10);
  const separators = config.separators || ['\n\n', '\n', '. ', ' ', ''];

  function split(textToSplit: string, separatorList: string[]): string[] {
    const finalChunks: string[] = [];
    let separator = separatorList[separatorList.length - 1];
    let newSeparators: string[] = [];

    for (let i = 0; i < separatorList.length; i++) {
      const s = separatorList[i];
      if (s === '') {
        separator = s;
        break;
      }
      if (textToSplit.includes(s)) {
        separator = s;
        newSeparators = separatorList.slice(i + 1);
        break;
      }
    }

    const splits = separator === '' ? textToSplit.split('') : textToSplit.split(separator);
    let currentDoc: string[] = [];
    let currentLength = 0;

    for (const piece of splits) {
      const pieceLen = piece.length + (currentDoc.length > 0 ? separator.length : 0);

      if (currentLength + pieceLen > chunkSize) {
        if (currentDoc.length > 0) {
          const doc = currentDoc.join(separator);
          if (doc.length > chunkSize && newSeparators.length > 0) {
            finalChunks.push(...split(doc, newSeparators));
          } else {
            finalChunks.push(doc);
          }

          // Compute overlap for sliding window
          while (currentLength > chunkOverlap && currentDoc.length > 0) {
            const removed = currentDoc.shift();
            currentLength -= (removed ? removed.length + (currentDoc.length > 0 ? separator.length : 0) : 0);
          }
        }
      }

      currentDoc.push(piece);
      currentLength += piece.length + (currentDoc.length > 1 ? separator.length : 0);
    }

    if (currentDoc.length > 0) {
      const remainingDoc = currentDoc.join(separator);
      if (remainingDoc.length > chunkSize && newSeparators.length > 0) {
        finalChunks.push(...split(remainingDoc, newSeparators));
      } else {
        finalChunks.push(remainingDoc);
      }
    }

    return finalChunks;
  }

  const rawChunkTexts = split(text, separators).filter(c => c.trim().length > 0);
  const results: ChunkResult[] = [];
  let searchOffset = 0;

  for (let i = 0; i < rawChunkTexts.length; i++) {
    const chunkText = rawChunkTexts[i];
    let charStart = text.indexOf(chunkText, searchOffset);

    // If offset moved ahead due to overlap rewind
    if (charStart === -1) {
      charStart = text.indexOf(chunkText, Math.max(0, searchOffset - chunkSize * 2));
    }
    if (charStart === -1) {
      charStart = searchOffset;
    }

    const charEnd = charStart + chunkText.length;
    searchOffset = Math.max(charStart + 1, charEnd - chunkOverlap);

    // Calculate overlap with previous chunk
    let overlapWithPrevious = '';
    let overlapCharLength = 0;
    if (i > 0) {
      const prev = results[i - 1];
      if (charStart < prev.charEnd) {
        overlapCharLength = Math.max(0, prev.charEnd - charStart);
        overlapWithPrevious = text.slice(charStart, prev.charEnd);
      }
    }

    const isFractured = detectSentenceFracture(text, charStart, charEnd);
    const color = CHUNK_COLORS[i % CHUNK_COLORS.length];

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
      color
    });
  }

  return results;
}
