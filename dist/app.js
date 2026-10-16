import { SAMPLE_DOCUMENTS } from './samples.js';
import { computeMetrics } from './splitters/analyzer.js';
import { splitTextRecursive } from './splitters/recursive.js';
import { splitTextSentence } from './splitters/sentence.js';
import { splitTextFixed } from './splitters/fixed.js';
import { splitTextMarkdown } from './splitters/markdown.js';
import { generateExportJson, generateLangChainCode, generateLlamaIndexCode } from './splitters/code-gen.js';
class RagChunkVisualizerApp {
    currentConfig = {
        strategy: 'recursive',
        chunkSize: 320,
        chunkOverlap: 60
    };
    currentText = '';
    currentChunks = [];
    currentMetrics = null;
    activeExportTab = 'langchain';
    // DOM Elements
    sampleSelect = document.getElementById('sample-select');
    inputText = document.getElementById('input-text');
    chunkSizeInput = document.getElementById('chunk-size');
    chunkSizeVal = document.getElementById('chunk-size-val');
    chunkOverlapInput = document.getElementById('chunk-overlap');
    chunkOverlapVal = document.getElementById('chunk-overlap-val');
    strategyButtons = document.querySelectorAll('.strategy-pill');
    // Metrics DOM
    metricChunks = document.getElementById('metric-chunks');
    metricTokens = document.getElementById('metric-tokens');
    metricAvgTokens = document.getElementById('metric-avg-tokens');
    metricOverlap = document.getElementById('metric-overlap');
    metricFractures = document.getElementById('metric-fractures');
    metricCost = document.getElementById('metric-cost');
    // View Containers
    documentMap = document.getElementById('document-map');
    chunkCardsList = document.getElementById('chunk-cards-list');
    // Export Modal Elements
    exportModal = document.getElementById('export-modal');
    openExportBtn = document.getElementById('open-export-btn');
    closeExportBtn = document.getElementById('close-export-btn');
    exportCodeBlock = document.getElementById('export-code-block');
    copyExportBtn = document.getElementById('copy-export-btn');
    downloadJsonBtn = document.getElementById('download-json-btn');
    exportTabs = document.querySelectorAll('.export-tab-btn');
    constructor() {
        this.init();
    }
    init() {
        this.populateSampleSelector();
        this.setupEventListeners();
        // Load initial sample
        const initialSample = SAMPLE_DOCUMENTS[0];
        this.inputText.value = initialSample.content;
        this.currentText = initialSample.content;
        this.currentConfig.strategy = initialSample.defaultStrategy;
        this.currentConfig.chunkSize = initialSample.defaultChunkSize;
        this.currentConfig.chunkOverlap = initialSample.defaultChunkOverlap;
        this.syncControls();
        this.recompute();
    }
    populateSampleSelector() {
        this.sampleSelect.innerHTML = '';
        SAMPLE_DOCUMENTS.forEach(sample => {
            const option = document.createElement('option');
            option.value = sample.id;
            option.textContent = `${sample.title} (${sample.category})`;
            this.sampleSelect.appendChild(option);
        });
    }
    setupEventListeners() {
        // Sample change
        this.sampleSelect.addEventListener('change', () => {
            const selected = SAMPLE_DOCUMENTS.find(s => s.id === this.sampleSelect.value);
            if (selected) {
                this.inputText.value = selected.content;
                this.currentText = selected.content;
                this.currentConfig.strategy = selected.defaultStrategy;
                this.currentConfig.chunkSize = selected.defaultChunkSize;
                this.currentConfig.chunkOverlap = selected.defaultChunkOverlap;
                this.syncControls();
                this.recompute();
            }
        });
        // Input text edits
        this.inputText.addEventListener('input', () => {
            this.currentText = this.inputText.value;
            this.recompute();
        });
        // Chunk Size slider
        this.chunkSizeInput.addEventListener('input', () => {
            const val = parseInt(this.chunkSizeInput.value, 10);
            this.currentConfig.chunkSize = val;
            this.chunkSizeVal.textContent = `${val} chars`;
            // Keep overlap strictly less than chunk size
            if (this.currentConfig.chunkOverlap >= val) {
                this.currentConfig.chunkOverlap = Math.max(0, val - 20);
                this.chunkOverlapInput.value = String(this.currentConfig.chunkOverlap);
                this.chunkOverlapVal.textContent = `${this.currentConfig.chunkOverlap} chars`;
            }
            this.chunkOverlapInput.max = String(Math.max(0, val - 10));
            this.recompute();
        });
        // Chunk Overlap slider
        this.chunkOverlapInput.addEventListener('input', () => {
            const val = parseInt(this.chunkOverlapInput.value, 10);
            this.currentConfig.chunkOverlap = val;
            this.chunkOverlapVal.textContent = `${val} chars`;
            this.recompute();
        });
        // Strategy button selection
        this.strategyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const strat = btn.dataset.strategy;
                if (strat) {
                    this.currentConfig.strategy = strat;
                    this.updateStrategyButtonsUI();
                    this.recompute();
                }
            });
        });
        // Export Modal listeners
        this.openExportBtn.addEventListener('click', () => this.openExportModal());
        this.closeExportBtn.addEventListener('click', () => this.closeExportModal());
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape' && !this.exportModal.classList.contains('hidden')) {
                this.closeExportModal();
            }
        });
        this.exportModal.addEventListener('click', e => {
            if (e.target === this.exportModal) {
                this.closeExportModal();
            }
        });
        this.exportTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                if (target) {
                    this.activeExportTab = target;
                    this.exportTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
                    this.renderExportContent();
                }
            });
        });
        this.copyExportBtn.addEventListener('click', () => this.copyExportCode());
        this.downloadJsonBtn.addEventListener('click', () => this.downloadJsonFile());
    }
    syncControls() {
        this.chunkSizeInput.value = String(this.currentConfig.chunkSize);
        this.chunkSizeVal.textContent = `${this.currentConfig.chunkSize} chars`;
        this.chunkOverlapInput.max = String(Math.max(0, this.currentConfig.chunkSize - 10));
        this.chunkOverlapInput.value = String(this.currentConfig.chunkOverlap);
        this.chunkOverlapVal.textContent = `${this.currentConfig.chunkOverlap} chars`;
        this.updateStrategyButtonsUI();
    }
    updateStrategyButtonsUI() {
        this.strategyButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.strategy === this.currentConfig.strategy);
        });
    }
    recompute() {
        if (!this.currentText || this.currentText.trim().length === 0) {
            this.currentChunks = [];
            this.currentMetrics = computeMetrics('', []);
            this.renderMetrics();
            this.renderDocumentMap();
            this.renderChunkCards();
            return;
        }
        switch (this.currentConfig.strategy) {
            case 'sentence':
                this.currentChunks = splitTextSentence(this.currentText, this.currentConfig);
                break;
            case 'fixed':
                this.currentChunks = splitTextFixed(this.currentText, this.currentConfig);
                break;
            case 'markdown':
                this.currentChunks = splitTextMarkdown(this.currentText, this.currentConfig);
                break;
            case 'recursive':
            default:
                this.currentChunks = splitTextRecursive(this.currentText, this.currentConfig);
                break;
        }
        this.currentMetrics = computeMetrics(this.currentText, this.currentChunks);
        this.renderMetrics();
        this.renderDocumentMap();
        this.renderChunkCards();
    }
    renderMetrics() {
        if (!this.currentMetrics)
            return;
        this.metricChunks.textContent = String(this.currentMetrics.totalChunks);
        this.metricTokens.textContent = this.currentMetrics.totalTokens.toLocaleString();
        this.metricAvgTokens.textContent = String(this.currentMetrics.avgChunkTokens);
        this.metricOverlap.textContent = `${this.currentMetrics.overlapPercentage}%`;
        const fractures = this.currentMetrics.fracturedSentenceCount;
        this.metricFractures.textContent = String(fractures);
        if (fractures > 0) {
            this.metricFractures.classList.add('text-amber');
        }
        else {
            this.metricFractures.classList.remove('text-amber');
        }
        this.metricCost.textContent = `${this.currentMetrics.estimatedEmbeddingCost.openAiSmall} / ${this.currentMetrics.estimatedEmbeddingCost.geminiEmbedding}`;
    }
    renderDocumentMap() {
        this.documentMap.innerHTML = '';
        if (this.currentChunks.length === 0) {
            this.documentMap.innerHTML = '<div class="empty-state">No chunks generated. Enter text above to visualize chunking.</div>';
            return;
        }
        this.currentChunks.forEach(chunk => {
            const chunkBadge = document.createElement('div');
            chunkBadge.className = `map-chunk-block ${chunk.isFracturedSentence ? 'fractured' : ''}`;
            chunkBadge.id = `map-chunk-${chunk.index}`;
            chunkBadge.style.borderColor = chunk.color;
            const header = document.createElement('div');
            header.className = 'map-chunk-header';
            header.innerHTML = `
        <span class="chunk-badge" style="background-color: ${chunk.color}22; color: ${chunk.color}; border: 1px solid ${chunk.color}66;">
          Chunk #${chunk.index}
        </span>
        <span class="chunk-stats">
          ${chunk.tokenCount} tokens • ${chunk.charEnd - chunk.charStart} chars
        </span>
        ${chunk.isFracturedSentence ? '<span class="fracture-tag">⚠️ Sentence Fractured</span>' : ''}
        ${chunk.overlapCharLength > 0 ? `<span class="overlap-tag">↔ ${chunk.overlapCharLength} overlap chars</span>` : ''}
      `;
            const body = document.createElement('div');
            body.className = 'map-chunk-text';
            body.textContent = chunk.text;
            chunkBadge.appendChild(header);
            chunkBadge.appendChild(body);
            // Interactions
            chunkBadge.addEventListener('mouseenter', () => {
                chunkBadge.classList.add('highlighted');
                const correspondingCard = document.getElementById(`card-chunk-${chunk.index}`);
                if (correspondingCard) {
                    correspondingCard.classList.add('highlighted');
                }
            });
            chunkBadge.addEventListener('mouseleave', () => {
                chunkBadge.classList.remove('highlighted');
                const correspondingCard = document.getElementById(`card-chunk-${chunk.index}`);
                if (correspondingCard) {
                    correspondingCard.classList.remove('highlighted');
                }
            });
            chunkBadge.addEventListener('click', () => {
                const correspondingCard = document.getElementById(`card-chunk-${chunk.index}`);
                if (correspondingCard) {
                    correspondingCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    correspondingCard.classList.add('ring-active');
                    setTimeout(() => correspondingCard.classList.remove('ring-active'), 1500);
                }
            });
            this.documentMap.appendChild(chunkBadge);
        });
    }
    renderChunkCards() {
        this.chunkCardsList.innerHTML = '';
        if (this.currentChunks.length === 0) {
            this.chunkCardsList.innerHTML = '<div class="empty-state">No chunks to inspect.</div>';
            return;
        }
        this.currentChunks.forEach(chunk => {
            const card = document.createElement('div');
            card.className = 'chunk-card';
            card.id = `card-chunk-${chunk.index}`;
            const header = document.createElement('div');
            header.className = 'chunk-card-header';
            header.innerHTML = `
        <div class="chunk-card-title">
          <span class="chunk-indicator" style="background-color: ${chunk.color};"></span>
          <strong>Chunk #${chunk.index}</strong>
          <span class="chunk-range">[chars ${chunk.charStart}–${chunk.charEnd}]</span>
        </div>
        <div class="chunk-card-actions">
          <button class="copy-chunk-btn" title="Copy chunk text">Copy</button>
        </div>
      `;
            const metaRow = document.createElement('div');
            metaRow.className = 'chunk-card-meta';
            metaRow.innerHTML = `
        <span><strong>Tokens:</strong> ~${chunk.tokenCount}</span>
        <span><strong>Characters:</strong> ${chunk.text.length}</span>
        ${chunk.overlapCharLength > 0
                ? `<span class="overlap-text"><strong>Overlap:</strong> ${chunk.overlapCharLength} chars with #${chunk.index - 1}</span>`
                : '<span><strong>Overlap:</strong> None</span>'}
        ${chunk.isFracturedSentence
                ? '<span class="text-amber"><strong>Warning:</strong> Fractures mid-sentence</span>'
                : '<span class="text-emerald"><strong>Boundary:</strong> Clean</span>'}
      `;
            const snippet = document.createElement('div');
            snippet.className = 'chunk-card-body';
            snippet.textContent = chunk.text;
            card.appendChild(header);
            card.appendChild(metaRow);
            card.appendChild(snippet);
            // Copy chunk text
            const copyBtn = header.querySelector('.copy-chunk-btn');
            copyBtn.addEventListener('click', e => {
                e.stopPropagation();
                navigator.clipboard.writeText(chunk.text);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
            });
            card.addEventListener('mouseenter', () => {
                const correspondingBlock = document.getElementById(`map-chunk-${chunk.index}`);
                if (correspondingBlock) {
                    correspondingBlock.classList.add('highlighted');
                }
            });
            card.addEventListener('mouseleave', () => {
                const correspondingBlock = document.getElementById(`map-chunk-${chunk.index}`);
                if (correspondingBlock) {
                    correspondingBlock.classList.remove('highlighted');
                }
            });
            this.chunkCardsList.appendChild(card);
        });
    }
    openExportModal() {
        this.exportModal.classList.remove('hidden');
        this.renderExportContent();
    }
    closeExportModal() {
        this.exportModal.classList.add('hidden');
    }
    renderExportContent() {
        if (!this.currentMetrics)
            return;
        if (this.activeExportTab === 'langchain') {
            this.exportCodeBlock.textContent = generateLangChainCode(this.currentConfig);
        }
        else if (this.activeExportTab === 'llamaindex') {
            this.exportCodeBlock.textContent = generateLlamaIndexCode(this.currentConfig);
        }
        else {
            this.exportCodeBlock.textContent = generateExportJson(this.currentConfig, this.currentMetrics, this.currentChunks);
        }
    }
    copyExportCode() {
        const textToCopy = this.exportCodeBlock.textContent || '';
        navigator.clipboard.writeText(textToCopy);
        this.copyExportBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            this.copyExportBtn.textContent = 'Copy to Clipboard';
        }, 1500);
    }
    downloadJsonFile() {
        if (!this.currentMetrics)
            return;
        const jsonStr = generateExportJson(this.currentConfig, this.currentMetrics, this.currentChunks);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rag-chunks-${this.currentConfig.strategy}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new RagChunkVisualizerApp();
});
