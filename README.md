# RAG Chunk Visualizer & Overlap Inspector ⚡

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-green?logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Built by AstraMeld](https://img.shields.io/badge/Crafted%20by-AstraMeld-6366f1)](https://astrameld.com)

An interactive visualizer, diagnostic tool, and code generator for **Retrieval-Augmented Generation (RAG)** chunking algorithms.

Designed for AI engineers, LLM architects, and data practitioners who want to look inside chunking pipelines, eliminate sentence fractures, optimize token overlaps, and generate clean LangChain & LlamaIndex production code.

---

## ⚡ The Problem: Why Chunking Breaks RAG

Chunk size is the single most decisive hyperparameter in any vector retrieval pipeline:
1. **Chunks too small**: The embedding captures isolated fragments without context, causing semantic drift during cross-encoder re-ranking.
2. **Chunks too large**: The vector averages multiple disparate concepts, diluting the similarity score for specific factual queries.
3. **Sentence Fractures**: Arbitrary splitters slice through clauses mid-sentence, destroying grammatical relationships and confusing dense retrievers.
4. **Uncontrolled Overlap**: Excessive overlap inflates embedding index costs and floods LLM context windows with duplicated tokens.

This tool gives you immediate visual and statistical clarity on all four factors.

---

## ✨ Features

- **Multi-Algorithm Support**:
  - **Recursive Character Splitter** (Matches LangChain's hierarchical splitting).
  - **Sentence-Aware Splitter** (Preserves grammatical sentence boundaries matching LlamaIndex).
  - **Markdown Header-Aware Splitter** (Groups sections under `#`, `##`, `###` headings with recursive sub-splitting).
  - **Fixed Sliding Window** (Deterministic baseline for comparative benchmarking).
- **Interactive Visual Document Map**:
  - Color-coded chunk segments with real-time hover synchronization.
  - Sentence fracture alerts: Flags chunks where thoughts were cleaved mid-sentence.
  - Overlap badges: Identifies exact character and token duplication with predecessor nodes.
- **Real-Time Analytics & Cost Estimation**:
  - Node count & average tokens per chunk.
  - Overall document overlap percentage.
  - Instant pricing estimates for **OpenAI `text-embedding-3-small`** and **Google Gemini `text-embedding-004`**.
- **1-Click Pipeline Code Export**:
  - Production-ready Python code for **LangChain** (`langchain_text_splitters`).
  - Production-ready Python code for **LlamaIndex** (`llama_index.core.node_parser`).
  - Structured **JSON** export containing chunk offsets, token counts, and fracture flags.
- **Zero-Dependency Core**:
  - Implemented in pure strict TypeScript with zero runtime bloat.
  - Works out of the box in any browser or modern Node environment.

---

## 🚀 Quick Start

### 1. Run in Browser Locally
Clone the repository and open `index.html` via any local HTTP server:

```bash
git clone https://github.com/3liAf/rag-chunk-visualizer.git
cd rag-chunk-visualizer
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

### 2. Run Tests & Coverage
```bash
npm install

# Run unit tests (33 tests, ~800ms)
npm test

# Run unit tests with detailed coverage report (>98% coverage)
npm run test:coverage

# Run Playwright E2E tests (Desktop + Mobile Chrome)
npm run test:e2e

# Production build
npm run build
```

---

## 🏗️ Project Architecture

```
rag-chunk-visualizer/
├── src/
│   ├── types.ts              # Core TypeScript interfaces (ChunkResult, SplitterConfig, Metrics)
│   ├── samples.ts            # Realistic benchmark documents (Technical, Legal, Incident)
│   ├── app.ts                # Reactive DOM orchestrator and interaction controller
│   └── splitters/
│       ├── analyzer.ts       # Token estimation, sentence fracture detection, metrics
│       ├── recursive.ts      # LangChain-compatible recursive character splitter
│       ├── sentence.ts       # Sentence boundary-preserving splitter
│       ├── markdown.ts       # Heading-aware document parser
│       ├── fixed.ts          # Sliding window splitter
│       └── code-gen.ts       # LangChain, LlamaIndex, and JSON code generators
├── styles/
│   └── main.css              # Dark-mode first UI styling
├── tests/
│   ├── splitters.test.ts     # Vitest unit test suite (splitters, boundary conditions, code gen)
│   └── samples.test.ts       # Benchmark documents integrity tests
├── e2e/
│   └── visualizer.spec.ts    # Playwright end-to-end user journey tests
├── dist/                     # Compiled ES modules
├── index.html                # Main application interface
├── playwright.config.ts      # Playwright test configuration
├── vitest.config.ts          # Vitest coverage and runner configuration
└── package.json
```

---

## 💻 Code Export Example

Once you find the optimal chunking parameters for your documents in the visualizer, click **"Export Pipeline Code"** to instantly generate drop-in Python code:

### LangChain
```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=320,
    chunk_overlap=60,
    separators=["\n\n", "\n", ". ", " ", ""]
)

chunks = text_splitter.split_text(your_document_text)
print(f"Generated {len(chunks)} chunks.")
```

### LlamaIndex
```python
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core import Document

splitter = SentenceSplitter(
    chunk_size=320,
    chunk_overlap=60
)

document = Document(text=your_document_text)
nodes = splitter.get_nodes_from_documents([document])
print(f"Generated {len(nodes)} nodes.")
```

---

## 👨‍💻 Author

**Ali Afzal Yousuf**  
- Founder & AI Solutions Architect at [AstraMeld](https://astrameld.com)
- GitHub: [@3liAf](https://github.com/3liAf)
- LinkedIn: [Ali Afzal Yousuf](https://linkedin.com)

If you are building enterprise AI solutions, RAG pipelines, or autonomous agent workflows, visit **[astrameld.com](https://astrameld.com)**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
