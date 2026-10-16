import { describe, it, expect } from 'vitest';
import { estimateTokenCount, detectSentenceFracture, computeMetrics } from '../src/splitters/analyzer.js';
import { splitTextRecursive } from '../src/splitters/recursive.js';
import { splitTextSentence } from '../src/splitters/sentence.js';
import { splitTextFixed } from '../src/splitters/fixed.js';
import { splitTextMarkdown } from '../src/splitters/markdown.js';
import { generateLangChainCode, generateLlamaIndexCode, generateExportJson } from '../src/splitters/code-gen.js';
import { SplitterConfig } from '../src/types.js';

describe('RAG Splitter & Analyzer Core', () => {
  const sampleProse = `Retrieval-Augmented Generation (RAG) is an AI architecture that enhances large language models with external knowledge. Instead of relying solely on the weights learned during pre-training, RAG retrieves relevant document chunks from a vector database. This dramatically reduces hallucinations and keeps enterprise knowledge grounded. Choosing the right chunk size and overlap is crucial for retrieval accuracy.`;

  const sampleMarkdown = `# RAG Architecture Overview

Retrieval-Augmented Generation combines search with generative intelligence.

## Vector Embeddings
Embeddings convert semantic meaning into high-dimensional numerical vectors. Cosine similarity calculates relevance.

## Chunking Best Practices
Small chunks preserve high semantic granularity. Large chunks provide broader context. Overlap prevents information fractures at chunk edges.`;

  describe('Analyzer', () => {
    it('estimates tokens accurately within expected NLP bounds', () => {
      const tokens = estimateTokenCount(sampleProse);
      expect(tokens).toBeGreaterThan(40);
      expect(tokens).toBeLessThan(120);
    });

    it('detects sentence fractures properly', () => {
      // Splitting mid-word or mid-sentence without punctuation
      const text = 'The quick brown fox jumps over the lazy dog.';
      const isFractured = detectSentenceFracture(text, 0, 15); // "The quick brown"
      expect(isFractured).toBe(true);

      const isClean = detectSentenceFracture(text, 0, text.length);
      expect(isClean).toBe(false);
    });

    it('computes metrics including cost and overlap', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 120, chunkOverlap: 20 };
      const chunks = splitTextRecursive(sampleProse, config);
      const metrics = computeMetrics(sampleProse, chunks);

      expect(metrics.totalCharacters).toBe(sampleProse.length);
      expect(metrics.totalChunks).toBe(chunks.length);
      expect(metrics.avgChunkTokens).toBeGreaterThan(0);
      expect(metrics.estimatedEmbeddingCost.openAiSmall).toBeDefined();
      expect(metrics.estimatedEmbeddingCost.geminiEmbedding).toBeDefined();
    });
  });

  describe('Recursive Splitter', () => {
    it('splits text within requested chunk size bounds', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 150, chunkOverlap: 25 };
      const chunks = splitTextRecursive(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(200); // respects chunk boundary with separator allowance
        expect(chunk.id).toMatch(/^chunk-\d+$/);
      }
    });

    it('identifies overlap between consecutive chunks', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 120, chunkOverlap: 30 };
      const chunks = splitTextRecursive(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(1);
      // At least one chunk should have overlap recorded
      const hasOverlap = chunks.some(c => c.overlapCharLength > 0);
      expect(hasOverlap).toBe(true);
    });
  });

  describe('Sentence Splitter', () => {
    it('groups by sentence boundaries', () => {
      const config: SplitterConfig = { strategy: 'sentence', chunkSize: 180, chunkOverlap: 20 };
      const chunks = splitTextSentence(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Fixed Window Splitter', () => {
    it('slices cleanly with sliding window and overlap', () => {
      const config: SplitterConfig = { strategy: 'fixed', chunkSize: 100, chunkOverlap: 20 };
      const chunks = splitTextFixed(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks[0].text.length).toBe(100);
      expect(chunks[1].overlapCharLength).toBe(20);
    });
  });

  describe('Markdown Splitter', () => {
    it('preserves markdown headers and sections', () => {
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 300, chunkOverlap: 30 };
      const chunks = splitTextMarkdown(sampleMarkdown, config);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      const hasHeader = chunks.some(c => c.text.includes('#'));
      expect(hasHeader).toBe(true);
    });
  });

  describe('Code Generation', () => {
    const config: SplitterConfig = { strategy: 'recursive', chunkSize: 500, chunkOverlap: 50 };

    it('generates valid LangChain python snippet', () => {
      const code = generateLangChainCode(config);
      expect(code).toContain('RecursiveCharacterTextSplitter');
      expect(code).toContain('chunk_size=500');
      expect(code).toContain('chunk_overlap=50');
      expect(code).toContain('astrameld.com');
    });

    it('generates valid LlamaIndex python snippet', () => {
      const code = generateLlamaIndexCode(config);
      expect(code).toContain('TokenTextSplitter');
      expect(code).toContain('chunk_size=500');
      expect(code).toContain('astrameld.com');
    });

    it('generates well-formed JSON export', () => {
      const chunks = splitTextRecursive(sampleProse, config);
      const metrics = computeMetrics(sampleProse, chunks);
      const jsonStr = generateExportJson(config, metrics, chunks);

      const parsed = JSON.parse(jsonStr);
      expect(parsed.generator).toContain('RAG Chunk Visualizer');
      expect(parsed.author).toContain('Ali Afzal Yousuf');
      expect(parsed.metrics.totalCharacters).toBe(sampleProse.length);
      expect(parsed.chunks.length).toBe(chunks.length);
    });
  });
});
