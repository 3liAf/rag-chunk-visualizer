export type ChunkStrategy = 'recursive' | 'sentence' | 'fixed' | 'markdown';

export interface ChunkResult {
  id: string;
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
  tokenCount: number;
  overlapWithPrevious: string;
  overlapCharLength: number;
  isFracturedSentence: boolean;
  color: string;
}

export interface SplitterConfig {
  strategy: ChunkStrategy;
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export interface DocumentMetrics {
  totalCharacters: number;
  totalTokens: number;
  totalChunks: number;
  avgChunkTokens: number;
  overlapPercentage: number;
  fracturedSentenceCount: number;
  estimatedEmbeddingCost: {
    openAiSmall: string;
    geminiEmbedding: string;
  };
}

export interface PresetsMap {
  [key: string]: {
    name: string;
    strategy: ChunkStrategy;
    chunkSize: number;
    chunkOverlap: number;
    description: string;
  };
}
