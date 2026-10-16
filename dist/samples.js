export const SAMPLE_DOCUMENTS = [
    {
        id: 'rag-architecture',
        title: 'Enterprise RAG Architecture',
        category: 'Technical Article',
        defaultStrategy: 'recursive',
        defaultChunkSize: 320,
        defaultChunkOverlap: 60,
        content: `# Enterprise RAG System Architecture & Production Tradeoffs

Retrieval-Augmented Generation (RAG) is an architectural pattern that bridges static large language model capabilities with dynamic, private enterprise data. By grounding generation on retrieved passages, organizations eliminate hallucination risks and enforce document-level access permissions.

## 1. The Chunking Dilemma
Chunk size is the single most decisive hyperparameter in any vector retrieval pipeline. If chunks are configured too small, the embedding model captures isolated fragments that lack contextual coherence, causing semantic drift during cross-encoder re-ranking. Conversely, if chunks are overly large, the vector represents an average of disparate topics, diluting the similarity score for specific factual queries.

## 2. Sliding Windows & Boundary Fractures
Overlap acts as a safety harness across artificial token boundaries. When fixed or arbitrary length splitters bisect sentences mid-clause, critical semantic dependencies are fractured. Overlap ensures that at least one adjacent chunk preserves the complete thought. In high-stakes domains like medical diagnosis and algorithmic legal compliance, sentence-aware chunking with recursive fallback prevents catastrophic retrieval failures.

## 3. Hybrid Search & Vector Re-Ranking
Modern enterprise systems rarely rely solely on dense vector cosine similarity. High-precision architectures combine dense embeddings with sparse lexical search (BM25 or SPLADE) followed by a cross-encoder re-ranker (such as Cohere Rerank or BGE-Reranker-Large). This two-stage retrieval pipeline achieves high recall while maintaining sub-second query latency.`
    },
    {
        id: 'legal-contract',
        title: 'SaaS Data Processing Addendum',
        category: 'Legal / Contract',
        defaultStrategy: 'sentence',
        defaultChunkSize: 280,
        defaultChunkOverlap: 50,
        content: `DATA PROCESSING ADDENDUM (DPA)

Section 1. Definitions and Scope of Processing.
"Personal Data" means any information relating to an identified or identifiable natural person processed by AstraMeld on behalf of the Customer in connection with the Master Services Agreement. AstraMeld shall process Personal Data solely in accordance with documented instructions from Customer, including with respect to transfers of personal data to a third country or international organization.

Section 2. Security Measures and Encryption.
The Processor shall implement and maintain appropriate technical and organizational measures to ensure a level of security appropriate to the risk. These measures include multi-factor authentication for administrative access, AES-256 encryption at rest, TLS 1.3 encryption in transit, and continuous vulnerability scanning. The Processor shall ensure that persons authorized to process the personal data have committed themselves to confidentiality.

Section 3. Sub-processors and Audit Rights.
Customer grants general written authorization to Processor to engage Sub-processors for the purpose of hosting and infrastructure delivery. Processor shall maintain an up-to-date list of Sub-processors accessible via customer portal. In the event of a suspected security incident, Processor shall notify Customer without undue delay and within seventy-two (72) hours of becoming aware of the incident.`
    },
    {
        id: 'incident-postmortem',
        title: 'Distributed System Incident Postmortem',
        category: 'DevOps / Incident',
        defaultStrategy: 'markdown',
        defaultChunkSize: 300,
        defaultChunkOverlap: 40,
        content: `# Postmortem: Redis Cluster Eviction Storm (Severity 1)

Date: 2026-09-14
Incident Commander: Ali Afzal Yousuf
Impacted Services: Authentication Gateway, Session Cache, Rate Limiter

## Executive Summary
At 14:22 UTC, the primary Redis cluster experienced memory exhaustion triggered by an unindexed query pattern in the newly deployed analytics worker. Eviction policies caused active user sessions to drop, leading to an elevated 504 Gateway Timeout rate of 34% across the API gateway.

## Root Cause Analysis
A background batch job introduced in release v2.4.0 started serializing unbounded user activity history objects directly into hot session keys without TTL expirations. The memory threshold breached the 80% watermark at 14:18 UTC, triggering volatile-lru eviction.

## Remediation & Action Items
1. Apply explicit 24-hour TTL constraints on all cached activity streams.
2. Configure circuit breakers in the Auth Service to fall back gracefully to read-replica Postgres stores.
3. Establish alerting thresholds at 65% memory utilization.`
    }
];
