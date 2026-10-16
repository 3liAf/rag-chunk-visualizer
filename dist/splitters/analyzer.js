export const CHUNK_COLORS = [
    '#38bdf8', // Sky Blue
    '#34d399', // Emerald
    '#fbbf24', // Amber
    '#a78bfa', // Purple
    '#f472b6', // Pink
    '#fb923c', // Orange
    '#2dd4bf', // Teal
    '#818cf8', // Indigo
];
export function estimateTokenCount(text) {
    if (!text)
        return 0;
    // Standard NLP heuristic: 1 token ≈ 4 characters or ~0.75 words in English
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    // Blend word count and character count for high accuracy across prose and code
    const tokenEst = Math.round((chars / 4 + words / 0.75) / 2);
    return Math.max(1, tokenEst);
}
export function detectSentenceFracture(fullText, charStart, charEnd) {
    if (charStart === 0 && charEnd >= fullText.length)
        return false;
    const chunkText = fullText.slice(charStart, charEnd).trim();
    if (!chunkText)
        return false;
    // End boundary fracture: The chunk ends without a sentence terminator while text continues
    if (charEnd < fullText.length) {
        const endsWithPunctuation = /[.!?\n]$/.test(chunkText);
        const textAfter = fullText.slice(charEnd).trimStart();
        if (!endsWithPunctuation && textAfter.length > 0) {
            return true;
        }
    }
    // Start boundary fracture: The chunk starts mid-sentence without capitalization or after unpunctuated text
    if (charStart > 0) {
        const textBefore = fullText.slice(0, charStart).trimEnd();
        const startsWithCapital = /^[A-Z0-9"“'‘#]/.test(chunkText);
        const beforeEndsSentence = /[.!?\n]$/.test(textBefore);
        if (!startsWithCapital || !beforeEndsSentence) {
            return true;
        }
    }
    return false;
}
export function computeMetrics(fullText, chunks) {
    const totalCharacters = fullText.length;
    const totalTokens = estimateTokenCount(fullText);
    const totalChunks = chunks.length;
    if (totalChunks === 0) {
        return {
            totalCharacters: 0,
            totalTokens: 0,
            totalChunks: 0,
            avgChunkTokens: 0,
            overlapPercentage: 0,
            fracturedSentenceCount: 0,
            estimatedEmbeddingCost: {
                openAiSmall: '$0.0000',
                geminiEmbedding: '$0.0000'
            }
        };
    }
    const sumChunkTokens = chunks.reduce((acc, c) => acc + c.tokenCount, 0);
    const avgChunkTokens = Math.round(sumChunkTokens / totalChunks);
    const totalOverlapChars = chunks.reduce((acc, c) => acc + c.overlapCharLength, 0);
    const overlapPercentage = totalCharacters > 0
        ? Math.min(100, Math.round((totalOverlapChars / totalCharacters) * 100))
        : 0;
    const fracturedSentenceCount = chunks.filter(c => c.isFracturedSentence).length;
    // OpenAI text-embedding-3-small: $0.02 per 1,000,000 tokens ($0.00002 / 1k)
    const openAiCost = (sumChunkTokens / 1_000_000) * 0.02;
    // Gemini text-embedding-004: Free tier / $0.00002 per 1k characters
    const geminiCost = (totalCharacters / 1_000) * 0.00002;
    return {
        totalCharacters,
        totalTokens,
        totalChunks,
        avgChunkTokens,
        overlapPercentage,
        fracturedSentenceCount,
        estimatedEmbeddingCost: {
            openAiSmall: `$${openAiCost.toFixed(5)}`,
            geminiEmbedding: `$${geminiCost.toFixed(5)}`
        }
    };
}
