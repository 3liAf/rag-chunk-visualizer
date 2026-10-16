import { describe, it, expect } from 'vitest';
import { SAMPLE_DOCUMENTS } from '../src/samples.js';
import { splitTextRecursive } from '../src/splitters/recursive.js';
import { splitTextSentence } from '../src/splitters/sentence.js';
import { splitTextFixed } from '../src/splitters/fixed.js';
import { splitTextMarkdown } from '../src/splitters/markdown.js';
import { computeMetrics } from '../src/splitters/analyzer.js';

describe('SQA Benchmark Samples Integrity', () => {
  it('contains expected benchmark documents', () => {
    expect(SAMPLE_DOCUMENTS.length).toBeGreaterThanOrEqual(3);
    const ids = SAMPLE_DOCUMENTS.map(s => s.id);
    expect(ids).toContain('rag-architecture');
    expect(ids).toContain('legal-contract');
    expect(ids).toContain('incident-postmortem');
  });

  SAMPLE_DOCUMENTS.forEach(sample => {
    describe(`Sample: ${sample.title}`, () => {
      it('has valid non-empty metadata and content', () => {
        expect(sample.title).toBeTruthy();
        expect(sample.category).toBeTruthy();
        expect(sample.defaultChunkSize).toBeGreaterThan(50);
        expect(sample.defaultChunkOverlap).toBeGreaterThanOrEqual(0);
        expect(sample.content.trim().length).toBeGreaterThan(200);
      });

      it('splits cleanly across all 4 strategies without thrown errors', () => {
        const config = {
          strategy: sample.defaultStrategy,
          chunkSize: sample.defaultChunkSize,
          chunkOverlap: sample.defaultChunkOverlap
        };

        const recChunks = splitTextRecursive(sample.content, config);
        const senChunks = splitTextSentence(sample.content, config);
        const fixChunks = splitTextFixed(sample.content, config);
        const mdChunks = splitTextMarkdown(sample.content, config);

        expect(recChunks.length).toBeGreaterThan(0);
        expect(senChunks.length).toBeGreaterThan(0);
        expect(fixChunks.length).toBeGreaterThan(0);
        expect(mdChunks.length).toBeGreaterThan(0);

        // Verify metrics for each
        [recChunks, senChunks, fixChunks, mdChunks].forEach(chunks => {
          const metrics = computeMetrics(sample.content, chunks);
          expect(metrics.totalChunks).toBe(chunks.length);
          expect(metrics.totalTokens).toBeGreaterThan(0);
          expect(metrics.avgChunkTokens).toBeGreaterThan(0);
        });
      });
    });
  });
});
