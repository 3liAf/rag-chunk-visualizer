import { describe, it, expect } from 'vitest';
import { estimateTokenCount, detectSentenceFracture, computeMetrics, CHUNK_COLORS } from '../src/splitters/analyzer.js';
import { splitTextRecursive } from '../src/splitters/recursive.js';
import { splitTextSentence } from '../src/splitters/sentence.js';
import { splitTextFixed } from '../src/splitters/fixed.js';
import { splitTextMarkdown } from '../src/splitters/markdown.js';
import { generateLangChainCode, generateLlamaIndexCode, generateExportJson } from '../src/splitters/code-gen.js';
import { SplitterConfig } from '../src/types.js';

describe('SQA Full-Coverage: Splitters & Diagnostics Engine', () => {
  const sampleProse = `Retrieval-Augmented Generation (RAG) is an AI architecture that enhances large language models with external knowledge. Instead of relying solely on the weights learned during pre-training, RAG retrieves relevant document chunks from a vector database. This dramatically reduces hallucinations and keeps enterprise knowledge grounded. Choosing the right chunk size and overlap is crucial for retrieval accuracy.`;

  const sampleMarkdown = `# RAG Architecture Overview

Retrieval-Augmented Generation combines search with generative intelligence.

## Vector Embeddings
Embeddings convert semantic meaning into high-dimensional numerical vectors. Cosine similarity calculates relevance.

## Chunking Best Practices
Small chunks preserve high semantic granularity. Large chunks provide broader context. Overlap prevents information fractures at chunk edges.`;

  describe('Analyzer & Metrics', () => {
    it('estimates tokens accurately within expected NLP bounds', () => {
      const tokens = estimateTokenCount(sampleProse);
      expect(tokens).toBeGreaterThan(40);
      expect(tokens).toBeLessThan(120);
      expect(estimateTokenCount('')).toBe(0);
      expect(estimateTokenCount('word')).toBeGreaterThanOrEqual(1);
    });

    it('detects sentence fractures properly on various boundary types', () => {
      const text = 'The quick brown fox jumps over the lazy dog. A second sentence begins here.';
      // Fractured: cleaved mid-clause
      expect(detectSentenceFracture(text, 0, 15)).toBe(true);
      // Clean: full sentence boundary
      expect(detectSentenceFracture(text, 0, 44)).toBe(false);
      // Clean: entire string
      expect(detectSentenceFracture(text, 0, text.length)).toBe(false);
      // Fractured: starts mid-sentence with lowercase
      expect(detectSentenceFracture(text, 10, text.length)).toBe(true);
      // Empty input
      expect(detectSentenceFracture('', 0, 0)).toBe(false);
    });

    it('computes metrics on non-empty chunk sets', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 120, chunkOverlap: 20 };
      const chunks = splitTextRecursive(sampleProse, config);
      const metrics = computeMetrics(sampleProse, chunks);

      expect(metrics.totalCharacters).toBe(sampleProse.length);
      expect(metrics.totalChunks).toBe(chunks.length);
      expect(metrics.avgChunkTokens).toBeGreaterThan(0);
      expect(metrics.overlapPercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.estimatedEmbeddingCost.openAiSmall).toMatch(/^\$\d+\.\d{5}$/);
      expect(metrics.estimatedEmbeddingCost.geminiEmbedding).toMatch(/^\$\d+\.\d{5}$/);
    });

    it('handles empty document edge cases gracefully in metrics', () => {
      const metrics = computeMetrics('', []);
      expect(metrics.totalCharacters).toBe(0);
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.totalChunks).toBe(0);
      expect(metrics.avgChunkTokens).toBe(0);
      expect(metrics.overlapPercentage).toBe(0);
      expect(metrics.fracturedSentenceCount).toBe(0);
      expect(metrics.estimatedEmbeddingCost.openAiSmall).toBe('$0.0000');
      expect(metrics.estimatedEmbeddingCost.geminiEmbedding).toBe('$0.0000');
    });

    it('exports chunk colors array with sufficient variety', () => {
      expect(CHUNK_COLORS.length).toBeGreaterThanOrEqual(8);
      expect(CHUNK_COLORS[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Recursive Splitter Edge Cases', () => {
    it('returns empty array on empty or whitespace text', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 100, chunkOverlap: 20 };
      expect(splitTextRecursive('', config)).toEqual([]);
      expect(splitTextRecursive('   \n\t  ', config)).toEqual([]);
    });

    it('splits text within requested chunk size bounds', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 150, chunkOverlap: 25 };
      const chunks = splitTextRecursive(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeLessThanOrEqual(200);
        expect(chunk.id).toMatch(/^chunk-\d+$/);
      }
    });

    it('handles custom separators properly', () => {
      const customText = 'Section Alpha|Section Beta|Section Gamma|Section Delta|Section Epsilon';
      const config: SplitterConfig = {
        strategy: 'recursive',
        chunkSize: 25,
        chunkOverlap: 0,
        separators: ['|', '']
      };
      const chunks = splitTextRecursive(customText, config);
      expect(chunks.length).toBeGreaterThanOrEqual(3);
    });

    it('handles text smaller than chunk size without unnecessary split', () => {
      const shortText = 'Small text.';
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 500, chunkOverlap: 50 };
      const chunks = splitTextRecursive(shortText, config);
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(shortText);
    });
  });

  describe('Sentence Splitter Edge Cases', () => {
    it('returns empty array on empty input', () => {
      const config: SplitterConfig = { strategy: 'sentence', chunkSize: 100, chunkOverlap: 20 };
      expect(splitTextSentence('', config)).toEqual([]);
      expect(splitTextSentence('   ', config)).toEqual([]);
    });

    it('groups sentences up to chunk size budget', () => {
      const config: SplitterConfig = { strategy: 'sentence', chunkSize: 180, chunkOverlap: 30 };
      const chunks = splitTextSentence(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(0);
        expect(chunk.color).toBeDefined();
      }
    });

    it('handles single sentence longer than chunk size', () => {
      const singleLongSentence = 'This is a continuous single sentence without any period or terminator that extends for quite a long distance to test how the sentence splitter behaves.';
      const config: SplitterConfig = { strategy: 'sentence', chunkSize: 50, chunkOverlap: 10 };
      const chunks = splitTextSentence(singleLongSentence, config);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Fixed Window Splitter Edge Cases', () => {
    it('returns empty array on empty input', () => {
      const config: SplitterConfig = { strategy: 'fixed', chunkSize: 100, chunkOverlap: 20 };
      expect(splitTextFixed('', config)).toEqual([]);
      expect(splitTextFixed('   ', config)).toEqual([]);
    });

    it('slices cleanly with sliding window and exact overlap', () => {
      const config: SplitterConfig = { strategy: 'fixed', chunkSize: 100, chunkOverlap: 20 };
      const chunks = splitTextFixed(sampleProse, config);

      expect(chunks.length).toBeGreaterThan(2);
      expect(chunks[0].text.length).toBe(100);
      expect(chunks[1].overlapCharLength).toBe(20);
    });

    it('respects small overlap constraint safely', () => {
      const config: SplitterConfig = { strategy: 'fixed', chunkSize: 50, chunkOverlap: 0 };
      const chunks = splitTextFixed('123456789012345678901234567890123456789012345678901234567890', config);
      expect(chunks.length).toBe(2);
      expect(chunks[1].overlapCharLength).toBe(0);
    });
  });

  describe('Markdown Splitter Edge Cases', () => {
    it('returns empty array on empty input', () => {
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 100, chunkOverlap: 20 };
      expect(splitTextMarkdown('', config)).toEqual([]);
    });

    it('preserves markdown headers and sections', () => {
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 300, chunkOverlap: 30 };
      const chunks = splitTextMarkdown(sampleMarkdown, config);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      const hasHeader = chunks.some(c => c.text.includes('#'));
      expect(hasHeader).toBe(true);
    });

    it('falls back cleanly to recursive splitter when no headers exist', () => {
      const plainText = 'Just plain paragraph text without any markdown hashes or headers.';
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 30, chunkOverlap: 5 };
      const chunks = splitTextMarkdown(plainText, config);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('subdivides oversized markdown sections', () => {
      const hugeMarkdown = `# Massive Header\n\n` + 'Sentence one of the section. '.repeat(40);
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 200, chunkOverlap: 30 };
      const chunks = splitTextMarkdown(hugeMarkdown, config);
      expect(chunks.length).toBeGreaterThan(2);
    });
  });

  describe('Code Generation Across All Strategies', () => {
    it('generates valid LangChain code for recursive strategy', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 500, chunkOverlap: 50 };
      const code = generateLangChainCode(config);
      expect(code).toContain('RecursiveCharacterTextSplitter');
      expect(code).toContain('chunk_size=500');
      expect(code).toContain('astrameld.com');
    });

    it('generates valid LangChain code for markdown strategy', () => {
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 400, chunkOverlap: 40 };
      const code = generateLangChainCode(config);
      expect(code).toContain('MarkdownHeaderTextSplitter');
      expect(code).toContain('headers_to_split_on');
      expect(code).toContain('chunk_size=400');
    });

    it('generates valid LangChain code for sentence strategy', () => {
      const config: SplitterConfig = { strategy: 'sentence', chunkSize: 350, chunkOverlap: 30 };
      const code = generateLangChainCode(config);
      expect(code).toContain('NLTKTextSplitter');
      expect(code).toContain('chunk_size=350');
    });

    it('generates valid LlamaIndex code for sentence strategy', () => {
      const config: SplitterConfig = { strategy: 'sentence', chunkSize: 450, chunkOverlap: 45 };
      const code = generateLlamaIndexCode(config);
      expect(code).toContain('SentenceSplitter');
      expect(code).toContain('chunk_size=450');
      expect(code).toContain('llama_index.core.node_parser');
    });

    it('generates valid LlamaIndex code for markdown strategy', () => {
      const config: SplitterConfig = { strategy: 'markdown', chunkSize: 500, chunkOverlap: 50 };
      const code = generateLlamaIndexCode(config);
      expect(code).toContain('MarkdownNodeParser');
    });

    it('generates valid LlamaIndex code for recursive strategy (TokenTextSplitter)', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 600, chunkOverlap: 60 };
      const code = generateLlamaIndexCode(config);
      expect(code).toContain('TokenTextSplitter');
      expect(code).toContain('chunk_size=600');
    });

    it('generates well-formed JSON export with complete node hierarchy', () => {
      const config: SplitterConfig = { strategy: 'recursive', chunkSize: 200, chunkOverlap: 30 };
      const chunks = splitTextRecursive(sampleProse, config);
      const metrics = computeMetrics(sampleProse, chunks);
      const jsonStr = generateExportJson(config, metrics, chunks);

      const parsed = JSON.parse(jsonStr);
      expect(parsed.generator).toContain('RAG Chunk Visualizer');
      expect(parsed.author).toContain('Ali Afzal Yousuf');
      expect(parsed.repository).toContain('rag-chunk-visualizer');
      expect(parsed.metrics.totalCharacters).toBe(sampleProse.length);
      expect(parsed.chunks.length).toBe(chunks.length);
      expect(parsed.chunks[0].charStart).toBe(0);
      expect(parsed.chunks[0].text).toBeDefined();
    });
  });
});
