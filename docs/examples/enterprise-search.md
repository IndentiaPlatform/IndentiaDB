# Enterprise Search Examples

Full-text search (BM25), vector/embedding search, hybrid retrieval, AI agent patterns, and enterprise search features — all using SurrealQL.

---

## Table of Contents

### Full-Text Search (BM25)

1. [Basic BM25 Search](#1-basic-bm25-search)
2. [Multi-Field Search](#2-multi-field-search)
3. [Search Highlighting](#3-search-highlighting)
4. [Fuzzy Search (Stemming + Similarity)](#4-fuzzy-search)
5. [Phrase Search](#5-phrase-search)
6. [Boolean Filter (Text + Structured)](#6-boolean-filter)
7. [Faceted Aggregation](#7-faceted-aggregation)

### Vector / RAG

8. [Vector Store and Cosine Search](#8-vector-store-and-cosine-search)
9. [KNN with Euclidean Distance](#9-knn-with-euclidean-distance)
10. [Hybrid Text + Vector Search](#10-hybrid-text-and-vector-search)
11. [RAG Chunk-and-Retrieve](#11-rag-chunk-and-retrieve)
12. [RAG Context Window Assembly](#12-rag-context-window-assembly)
13. [RAG Metadata-Filtered Vector Search](#13-rag-metadata-filtered-vector-search)
14. [RAG Chunk Deduplication](#14-rag-chunk-deduplication)

### AI Agent Patterns

15. [Agent Tool Registry](#15-agent-tool-registry)
16. [Agent Conversation Memory](#16-agent-conversation-memory)
17. [Knowledge Extraction (Entity-Relation)](#17-knowledge-extraction)
18. [Agent Task Planning (DAG)](#18-agent-task-planning)
19. [Agent Observation Log](#19-agent-observation-log)
20. [Chain-of-Thought Reasoning with Provenance](#20-chain-of-thought-reasoning)
21. [Multi-Source Knowledge Fusion](#21-multi-source-knowledge-fusion)

### Enterprise Search Patterns

22. [Access-Controlled Search](#22-access-controlled-search)
23. [Search Audit Trail](#23-search-audit-trail)
24. [Document Lifecycle (Draft/Review/Published)](#24-document-lifecycle)
25. [Cross-Lingual Search](#25-cross-lingual-search)

---

## Full-Text Search (BM25)

### 1. Basic BM25 Search

Define an analyzer, create a full-text index, and search with BM25 relevance scoring.

```sql
-- Define analyzer with English stemming
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

-- Schema
DEFINE TABLE article SCHEMAFULL;
DEFINE FIELD title   ON article TYPE string;
DEFINE FIELD content ON article TYPE string;
DEFINE FIELD author  ON article TYPE string;

-- Full-text search index with BM25 parameters
DEFINE INDEX idx_article_content ON article FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75) HIGHLIGHTS;

-- Insert documents
CREATE article:1 SET title = 'Introduction to Graph Databases',
    content = 'Graph databases store data as nodes and edges, enabling fast traversals across connected data.',
    author = 'Alice';
CREATE article:2 SET title = 'Relational vs Graph',
    content = 'Traditional relational databases use tables and joins, while graph databases use direct connections.',
    author = 'Bob';
CREATE article:3 SET title = 'Vector Search Primer',
    content = 'Vector search uses embeddings to find semantically similar documents using cosine similarity.',
    author = 'Carol';
CREATE article:4 SET title = 'Enterprise Knowledge Management',
    content = 'Knowledge management systems help organizations store and retrieve critical data and information.',
    author = 'Dave';

-- BM25 search with relevance scoring
SELECT title, search::score(0) AS score
FROM article
WHERE content @0@ 'graph databases'
ORDER BY score DESC;
-- Returns articles 1 and 2 (both mention "graph databases")
```

### 2. Multi-Field Search

Search across separate indexed fields (title and content).

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE document SCHEMAFULL;
DEFINE FIELD title   ON document TYPE string;
DEFINE FIELD content ON document TYPE string;

-- Separate indexes for each field
DEFINE INDEX idx_doc_title   ON document FIELDS title
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);
DEFINE INDEX idx_doc_content ON document FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE document:1 SET title = 'Machine Learning Basics',
    content = 'An introduction to supervised and unsupervised learning algorithms.';
CREATE document:2 SET title = 'Deep Learning in Practice',
    content = 'Neural networks and deep learning enable advanced machine perception tasks.';
CREATE document:3 SET title = 'Database Performance Tuning',
    content = 'Optimize your database queries for maximum throughput and minimal latency.';

-- Search title field (index 0)
SELECT title, search::score(0) AS score
FROM document WHERE title @0@ 'learning'
ORDER BY score DESC;

-- Search content field (index 1)
SELECT title, search::score(1) AS score
FROM document WHERE content @1@ 'learning'
ORDER BY score DESC;
```

### 3. Search Highlighting

Use full-text search with the HIGHLIGHTS option and application-level snippet extraction.

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE page SCHEMAFULL;
DEFINE FIELD body ON page TYPE string;
DEFINE INDEX idx_page_body ON page FIELDS body
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75) HIGHLIGHTS;

CREATE page:1 SET body = 'The document retrieval pattern combines ranking with language models.';
CREATE page:2 SET body = 'Information systems rank documents by relevance to user queries.';

-- Search with score
SELECT body, search::score(0) AS score
FROM page WHERE body @0@ 'document'
ORDER BY score DESC;

-- In production, use search::highlight('<b>', '</b>') for server-side highlighting.
-- Application-level fallback: string replacement on matched terms.
```

### 4. Fuzzy Search

Stemming handles morphological variants; `string::similarity::fuzzy` handles misspellings.

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE kb_article SCHEMAFULL;
DEFINE FIELD title   ON kb_article TYPE string;
DEFINE FIELD content ON kb_article TYPE string;
DEFINE INDEX idx_kb_content ON kb_article FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE kb_article:1 SET title = 'Authentication Guide',
    content = 'Configure authentication using OAuth2 and OpenID Connect for secure access.';
CREATE kb_article:2 SET title = 'Authorization Policies',
    content = 'Define authorization policies to control access to resources and endpoints.';
CREATE kb_article:3 SET title = 'Kubernetes Deployment',
    content = 'Deploy containers to Kubernetes clusters using manifests and Helm charts.';

-- Stemming: "authenticating" matches "authentication" via snowball stemmer
SELECT title, search::score(0) AS score
FROM kb_article WHERE content @0@ 'authenticating'
ORDER BY score DESC;

-- Fuzzy fallback for severe misspellings
SELECT title, string::similarity::fuzzy(title, 'Kuberntes Deploymnt') AS sim
FROM kb_article
ORDER BY sim DESC
LIMIT 1;
-- Returns: "Kubernetes Deployment"
```

### 5. Phrase Search

Search for documents containing specific terms.

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE policy SCHEMAFULL;
DEFINE FIELD name    ON policy TYPE string;
DEFINE FIELD content ON policy TYPE string;
DEFINE INDEX idx_policy_content ON policy FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE policy:1 SET name = 'Data Retention',
    content = 'All personal data must be retained for a minimum of five years after account closure.';
CREATE policy:2 SET name = 'Access Control',
    content = 'Access to personal information is restricted to authorized personnel with valid clearance.';
CREATE policy:3 SET name = 'Data Processing',
    content = 'Personal data processing requires explicit consent from the data subject.';

-- Search for "personal data"
SELECT name, search::score(0) AS score
FROM policy WHERE content @0@ 'personal data'
ORDER BY score DESC;
-- Returns: Data Retention and Data Processing
```

### 6. Boolean Filter

Combine text search with structured field filters (category, year).

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE report SCHEMAFULL;
DEFINE FIELD title    ON report TYPE string;
DEFINE FIELD body     ON report TYPE string;
DEFINE FIELD category ON report TYPE string;
DEFINE FIELD year     ON report TYPE int;
DEFINE INDEX idx_report_body ON report FIELDS body
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE report:1 SET title = 'Q1 Security Audit',
    body = 'Vulnerability assessment revealed no critical security issues in production systems.',
    category = 'security', year = 2025;
CREATE report:2 SET title = 'Q2 Performance Review',
    body = 'System performance metrics show improved throughput after database optimization.',
    category = 'performance', year = 2025;
CREATE report:3 SET title = 'Annual Security Report',
    body = 'Comprehensive security review of all production and staging environments.',
    category = 'security', year = 2024;
CREATE report:4 SET title = 'Infrastructure Cost Analysis',
    body = 'Cloud infrastructure costs decreased by 15% following optimization efforts.',
    category = 'finance', year = 2025;

-- Text search + category filter
SELECT title, category, search::score(0) AS score
FROM report
WHERE body @0@ 'production'
  AND category = 'security'
ORDER BY score DESC;

-- Text search + year filter
SELECT title, year, search::score(0) AS score
FROM report
WHERE body @0@ 'optimization'
  AND year = 2025
ORDER BY score DESC;
```

### 7. Faceted Aggregation

Group search results by category for faceted navigation.

```sql
DEFINE TABLE finding SCHEMAFULL;
DEFINE FIELD summary  ON finding TYPE string;
DEFINE FIELD category ON finding TYPE string;
DEFINE FIELD severity ON finding TYPE string;

CREATE finding:1 SET summary = 'SQL injection vulnerability in login endpoint',
    category = 'security', severity = 'critical';
CREATE finding:2 SET summary = 'Cross-site scripting in user profile page',
    category = 'security', severity = 'high';
CREATE finding:3 SET summary = 'Slow query on dashboard aggregation',
    category = 'performance', severity = 'medium';
CREATE finding:4 SET summary = 'Memory leak in background worker process',
    category = 'reliability', severity = 'high';
CREATE finding:5 SET summary = 'Insecure deserialization in API gateway',
    category = 'security', severity = 'critical';
CREATE finding:6 SET summary = 'High CPU usage during peak traffic',
    category = 'performance', severity = 'high';

-- Facet by category
SELECT category, count() AS doc_count
FROM finding
GROUP BY category
ORDER BY doc_count DESC;
-- security: 3, performance: 2, reliability: 1

-- Facet by severity
SELECT severity, count() AS doc_count
FROM finding
GROUP BY severity
ORDER BY doc_count DESC;
-- high: 3, critical: 2, medium: 1
```

---

## Vector / RAG

### 8. Vector Store and Cosine Search

Store embeddings and find similar documents using `vector::similarity::cosine`.

```sql
DEFINE TABLE doc_embedding SCHEMAFULL;
DEFINE FIELD text      ON doc_embedding TYPE string;
DEFINE FIELD embedding ON doc_embedding TYPE array<float>;

-- Store documents with embeddings (4-dim for illustration; production uses 768/1536-dim)
CREATE doc_embedding:1 SET text = 'Kubernetes orchestrates containers at scale',
    embedding = [0.9, 0.1, 0.2, 0.05];
CREATE doc_embedding:2 SET text = 'Docker containers package applications',
    embedding = [0.85, 0.15, 0.25, 0.1];
CREATE doc_embedding:3 SET text = 'Machine learning models predict outcomes',
    embedding = [0.1, 0.9, 0.15, 0.05];
CREATE doc_embedding:4 SET text = 'Neural networks learn feature representations',
    embedding = [0.15, 0.85, 0.2, 0.1];
CREATE doc_embedding:5 SET text = 'SQL databases store structured data in tables',
    embedding = [0.2, 0.1, 0.9, 0.05];

-- Find documents similar to a "container" query
SELECT text, vector::similarity::cosine(embedding, [0.88, 0.12, 0.22, 0.08]) AS similarity
FROM doc_embedding
ORDER BY similarity DESC
LIMIT 3;
-- Top results: Kubernetes and Docker documents (similarity > 0.95)
```

### 9. KNN with Euclidean Distance

Use `vector::distance::euclidean` for nearest-neighbor search (lower = more similar).

```sql
DEFINE TABLE point SCHEMAFULL;
DEFINE FIELD label     ON point TYPE string;
DEFINE FIELD embedding ON point TYPE array<float>;

CREATE point:a SET label = 'cluster_A_1', embedding = [1.0, 2.0, 3.0];
CREATE point:b SET label = 'cluster_A_2', embedding = [1.1, 2.1, 2.9];
CREATE point:c SET label = 'cluster_B_1', embedding = [8.0, 9.0, 7.0];
CREATE point:d SET label = 'cluster_B_2', embedding = [8.1, 8.9, 7.1];
CREATE point:e SET label = 'outlier',     embedding = [50.0, 50.0, 50.0];

-- KNN-3 from query point near cluster A
SELECT label, vector::distance::euclidean(embedding, [1.05, 2.05, 2.95]) AS dist
FROM point
ORDER BY dist ASC
LIMIT 3;
-- Returns cluster_A_1, cluster_A_2, and cluster_B_1 (nearest distance < 0.2)
```

### 10. Hybrid Text and Vector Search

Combine BM25 text relevance with vector similarity for hybrid retrieval.

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE hybrid_doc SCHEMAFULL;
DEFINE FIELD title     ON hybrid_doc TYPE string;
DEFINE FIELD content   ON hybrid_doc TYPE string;
DEFINE FIELD embedding ON hybrid_doc TYPE array<float>;
DEFINE INDEX idx_hybrid_content ON hybrid_doc FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE hybrid_doc:1 SET title = 'Graph Query Languages',
    content = 'SPARQL and Cypher are popular graph query languages for traversing connected data.',
    embedding = [0.9, 0.2, 0.1, 0.05];
CREATE hybrid_doc:2 SET title = 'SQL Performance',
    content = 'Optimizing SQL queries with proper indexing and query planning improves performance.',
    embedding = [0.1, 0.9, 0.2, 0.05];
CREATE hybrid_doc:3 SET title = 'Graph Database Internals',
    content = 'Graph databases use adjacency lists and index-free adjacency for fast traversal.',
    embedding = [0.85, 0.15, 0.15, 0.1];

-- Step 1: BM25 text search
SELECT title, search::score(0) AS text_score
FROM hybrid_doc WHERE content @0@ 'graph'
ORDER BY text_score DESC;

-- Step 2: Vector search
SELECT title, vector::similarity::cosine(embedding, [0.87, 0.18, 0.12, 0.07]) AS vec_score
FROM hybrid_doc
ORDER BY vec_score DESC;

-- Step 3: In production, IndentiaDB's hybrid scorer (RRF or Bayesian) fuses
-- both signals automatically. See ES_HYBRID_SCORER environment variable.
```

### 11. RAG Chunk-and-Retrieve

Store document chunks with metadata and retrieve top-k by vector similarity for LLM context.

```sql
DEFINE TABLE chunk SCHEMAFULL;
DEFINE FIELD source    ON chunk TYPE string;
DEFINE FIELD chunk_idx ON chunk TYPE int;
DEFINE FIELD text      ON chunk TYPE string;
DEFINE FIELD embedding ON chunk TYPE array<float>;

CREATE chunk:s1_c0 SET source = 'architecture.md', chunk_idx = 0,
    text = 'IndentiaGraph is a multi-model database supporting RDF, LPG, and document models.',
    embedding = [0.8, 0.3, 0.1, 0.05];
CREATE chunk:s1_c1 SET source = 'architecture.md', chunk_idx = 1,
    text = 'The query engine translates SPARQL to SurrealQL for unified execution.',
    embedding = [0.7, 0.4, 0.15, 0.1];
CREATE chunk:s1_c2 SET source = 'architecture.md', chunk_idx = 2,
    text = 'Full-text search uses BM25 scoring with configurable analyzers.',
    embedding = [0.3, 0.2, 0.9, 0.05];
CREATE chunk:s2_c0 SET source = 'deployment.md', chunk_idx = 0,
    text = 'Deploy IndentiaGraph on Kubernetes using the provided Helm chart.',
    embedding = [0.1, 0.8, 0.2, 0.15];
CREATE chunk:s2_c1 SET source = 'deployment.md', chunk_idx = 1,
    text = 'Configure resource limits and persistent volumes for production deployments.',
    embedding = [0.15, 0.75, 0.25, 0.2];

-- RAG retrieval: user asks about "multi-model database architecture"
SELECT source, chunk_idx, text,
    vector::similarity::cosine(embedding, [0.78, 0.32, 0.12, 0.06]) AS relevance
FROM chunk
ORDER BY relevance DESC
LIMIT 3;
-- Top results from architecture.md
```

### 12. RAG Context Window Assembly

Retrieve chunks and assemble them with source citations for grounded LLM responses.

```sql
DEFINE TABLE context_chunk SCHEMAFULL;
DEFINE FIELD source    ON context_chunk TYPE string;
DEFINE FIELD section   ON context_chunk TYPE string;
DEFINE FIELD text      ON context_chunk TYPE string;
DEFINE FIELD embedding ON context_chunk TYPE array<float>;

CREATE context_chunk:1 SET source = 'ADR-001', section = 'Decision',
    text = 'We chose SurrealDB as the storage backend for its multi-model capabilities.',
    embedding = [0.9, 0.1, 0.1, 0.1];
CREATE context_chunk:2 SET source = 'ADR-001', section = 'Context',
    text = 'The system requires support for RDF triples, documents, and graph traversals.',
    embedding = [0.85, 0.15, 0.12, 0.08];
CREATE context_chunk:3 SET source = 'HLD-003', section = 'Overview',
    text = 'The search subsystem combines BM25 text ranking with vector similarity.',
    embedding = [0.2, 0.3, 0.9, 0.1];
CREATE context_chunk:4 SET source = 'HLD-003', section = 'Architecture',
    text = 'Hybrid search uses Reciprocal Rank Fusion to merge text and vector results.',
    embedding = [0.25, 0.25, 0.85, 0.15];

-- Retrieve and assemble context with source attribution
SELECT source, section, text,
    vector::similarity::cosine(embedding, [0.88, 0.12, 0.11, 0.09]) AS score
FROM context_chunk
ORDER BY score DESC
LIMIT 3;
-- Application assembles: "[ADR-001#Decision] We chose SurrealDB..."
```

### 13. RAG Metadata-Filtered Vector Search

Filter chunks by source, category, and date before vector search.

```sql
DEFINE TABLE filtered_chunk SCHEMAFULL;
DEFINE FIELD source     ON filtered_chunk TYPE string;
DEFINE FIELD category   ON filtered_chunk TYPE string;
DEFINE FIELD created_at ON filtered_chunk TYPE string;
DEFINE FIELD text       ON filtered_chunk TYPE string;
DEFINE FIELD embedding  ON filtered_chunk TYPE array<float>;

CREATE filtered_chunk:1 SET source = 'internal-wiki', category = 'engineering',
    created_at = '2025-06-01', text = 'Our API uses JWT tokens for authentication.',
    embedding = [0.8, 0.2, 0.1, 0.1];
CREATE filtered_chunk:2 SET source = 'internal-wiki', category = 'hr',
    created_at = '2025-05-15', text = 'Employee onboarding includes security training.',
    embedding = [0.2, 0.8, 0.1, 0.1];
CREATE filtered_chunk:3 SET source = 'external-docs', category = 'engineering',
    created_at = '2024-12-01', text = 'OAuth2 provides delegated authorization for APIs.',
    embedding = [0.75, 0.25, 0.15, 0.08];
CREATE filtered_chunk:4 SET source = 'internal-wiki', category = 'engineering',
    created_at = '2025-07-01', text = 'The gateway handles rate limiting and auth validation.',
    embedding = [0.7, 0.3, 0.2, 0.12];

-- Metadata filter: internal-wiki + engineering + 2025 only
SELECT source, text,
    vector::similarity::cosine(embedding, [0.78, 0.22, 0.12, 0.09]) AS score
FROM filtered_chunk
WHERE source = 'internal-wiki'
  AND category = 'engineering'
  AND created_at >= '2025-01-01'
ORDER BY score DESC
LIMIT 2;
-- Returns only internal-wiki engineering docs from 2025
```

### 14. RAG Chunk Deduplication

Deduplicate overlapping chunks from the same document.

```sql
DEFINE TABLE overlap_chunk SCHEMAFULL;
DEFINE FIELD doc_id    ON overlap_chunk TYPE string;
DEFINE FIELD chunk_idx ON overlap_chunk TYPE int;
DEFINE FIELD text      ON overlap_chunk TYPE string;
DEFINE FIELD embedding ON overlap_chunk TYPE array<float>;

CREATE overlap_chunk:d1_c0 SET doc_id = 'doc_A', chunk_idx = 0,
    text = 'The graph engine supports SPARQL 1.1 query language.',
    embedding = [0.9, 0.1, 0.1, 0.1];
CREATE overlap_chunk:d1_c1 SET doc_id = 'doc_A', chunk_idx = 1,
    text = 'SPARQL 1.1 query language with extensions for property paths.',
    embedding = [0.88, 0.12, 0.12, 0.08];
CREATE overlap_chunk:d2_c0 SET doc_id = 'doc_B', chunk_idx = 0,
    text = 'Vector embeddings enable semantic search over unstructured data.',
    embedding = [0.1, 0.9, 0.1, 0.1];
CREATE overlap_chunk:d2_c1 SET doc_id = 'doc_B', chunk_idx = 1,
    text = 'Semantic search finds conceptually similar documents.',
    embedding = [0.15, 0.85, 0.12, 0.08];

-- Raw retrieval (may return multiple chunks from same doc)
SELECT doc_id, chunk_idx, text,
    vector::similarity::cosine(embedding, [0.89, 0.11, 0.11, 0.09]) AS score
FROM overlap_chunk
ORDER BY score DESC;

-- Deduplicate by doc_id
SELECT doc_id, count() AS chunk_count
FROM overlap_chunk
GROUP BY doc_id;
-- 2 unique documents
```

---

## AI Agent Patterns

### 15. Agent Tool Registry

Store tool definitions for agents to discover and select appropriate tools.

```sql
DEFINE TABLE tool SCHEMALESS;

CREATE tool:web_search SET
    name = 'web_search',
    description = 'Search the web for current information',
    capabilities = ['search', 'web', 'current_events'],
    parameters = [
        { name: 'query', type: 'string', required: true },
        { name: 'max_results', type: 'int', required: false }
    ],
    cost_per_call = 0.01;
CREATE tool:database_query SET
    name = 'database_query',
    description = 'Execute SQL queries against the knowledge base',
    capabilities = ['search', 'database', 'structured_data'],
    parameters = [ { name: 'sql', type: 'string', required: true } ],
    cost_per_call = 0.001;
CREATE tool:code_interpreter SET
    name = 'code_interpreter',
    description = 'Execute Python code for data analysis',
    capabilities = ['compute', 'analysis', 'visualization'],
    parameters = [ { name: 'code', type: 'string', required: true } ],
    cost_per_call = 0.05;
CREATE tool:email_sender SET
    name = 'email_sender',
    description = 'Send emails to specified recipients',
    capabilities = ['communication', 'email'],
    parameters = [
        { name: 'to', type: 'string', required: true },
        { name: 'subject', type: 'string', required: true },
        { name: 'body', type: 'string', required: true }
    ],
    cost_per_call = 0.0;

-- Agent needs a tool with 'search' capability (cheapest first)
SELECT name, description, cost_per_call
FROM tool WHERE capabilities CONTAINS 'search'
ORDER BY cost_per_call ASC;
-- database_query (0.001), web_search (0.01)

-- Find communication tools
SELECT name FROM tool WHERE capabilities CONTAINS 'communication';
-- email_sender

-- Count required parameters per tool
SELECT name, parameters[WHERE required = true] AS required_params
FROM tool ORDER BY name;
```

### 16. Agent Conversation Memory

Store and retrieve conversation history with token budgeting.

```sql
DEFINE TABLE memory SCHEMAFULL;
DEFINE FIELD session_id ON memory TYPE string;
DEFINE FIELD role       ON memory TYPE string;
DEFINE FIELD content    ON memory TYPE string;
DEFINE FIELD timestamp  ON memory TYPE datetime;
DEFINE FIELD token_count ON memory TYPE int;

CREATE memory:1 SET session_id = 'sess_abc',
    role = 'user', content = 'What is IndentiaGraph?',
    timestamp = d'2026-03-21T10:00:00Z', token_count = 5;
CREATE memory:2 SET session_id = 'sess_abc',
    role = 'assistant', content = 'IndentiaGraph is a multi-model database that combines RDF, LPG, document, and relational models.',
    timestamp = d'2026-03-21T10:00:05Z', token_count = 18;
CREATE memory:3 SET session_id = 'sess_abc',
    role = 'user', content = 'How does full-text search work?',
    timestamp = d'2026-03-21T10:01:00Z', token_count = 7;
CREATE memory:4 SET session_id = 'sess_abc',
    role = 'assistant', content = 'Full-text search uses BM25 scoring with configurable analyzers and stemming.',
    timestamp = d'2026-03-21T10:01:05Z', token_count = 12;

-- Sliding context window: most recent turns first
SELECT role, content, timestamp
FROM memory
WHERE session_id = 'sess_abc'
ORDER BY timestamp DESC
LIMIT 4;

-- Token budget: retrieve all and accumulate on the application side
SELECT role, content, token_count, timestamp
FROM memory
WHERE session_id = 'sess_abc'
ORDER BY timestamp DESC;
```

### 17. Knowledge Extraction

Store entities and relations extracted by AI agents from unstructured text.

```sql
DEFINE TABLE entity SCHEMAFULL;
DEFINE FIELD name  ON entity TYPE string;
DEFINE FIELD etype ON entity TYPE string;
DEFINE FIELD source ON entity TYPE string;

DEFINE TABLE relation SCHEMAFULL;
DEFINE FIELD subject   ON relation TYPE string;
DEFINE FIELD predicate ON relation TYPE string;
DEFINE FIELD object    ON relation TYPE string;
DEFINE FIELD confidence ON relation TYPE float;
DEFINE FIELD source    ON relation TYPE string;

CREATE entity:e1 SET name = 'IndentiaGraph', etype = 'Software', source = 'doc_001';
CREATE entity:e2 SET name = 'SurrealDB', etype = 'Software', source = 'doc_001';
CREATE entity:e3 SET name = 'Oxigraph', etype = 'Software', source = 'doc_001';
CREATE entity:e4 SET name = 'SPARQL', etype = 'QueryLanguage', source = 'doc_001';
CREATE entity:e5 SET name = 'BM25', etype = 'Algorithm', source = 'doc_002';

CREATE relation:r1 SET subject = 'IndentiaGraph', predicate = 'uses', object = 'SurrealDB',
    confidence = 0.95, source = 'doc_001';
CREATE relation:r2 SET subject = 'IndentiaGraph', predicate = 'uses', object = 'Oxigraph',
    confidence = 0.90, source = 'doc_001';
CREATE relation:r3 SET subject = 'IndentiaGraph', predicate = 'supports', object = 'SPARQL',
    confidence = 0.98, source = 'doc_001';
CREATE relation:r4 SET subject = 'IndentiaGraph', predicate = 'implements', object = 'BM25',
    confidence = 0.85, source = 'doc_002';

-- What does IndentiaGraph use? (high confidence only)
SELECT object, confidence
FROM relation
WHERE subject = 'IndentiaGraph' AND predicate = 'uses' AND confidence > 0.8
ORDER BY confidence DESC;
-- SurrealDB (0.95), Oxigraph (0.90)

-- All Software entities
SELECT name FROM entity WHERE etype = 'Software' ORDER BY name;

-- Relations from a specific source
SELECT subject, predicate, object FROM relation WHERE source = 'doc_001';
```

### 18. Agent Task Planning

Store task dependencies as a DAG for topological execution ordering.

```sql
DEFINE TABLE task SCHEMALESS;

-- DAG: setup -> data_collection -> analysis -> [visualization, report]
CREATE task:setup SET name = 'Setup environment', status = 'completed',
    depends_on = [], priority = 1;
CREATE task:data_collection SET name = 'Collect data from APIs', status = 'completed',
    depends_on = ['task:setup'], priority = 2;
CREATE task:analysis SET name = 'Run statistical analysis', status = 'pending',
    depends_on = ['task:data_collection'], priority = 3;
CREATE task:visualization SET name = 'Create visualizations', status = 'pending',
    depends_on = ['task:analysis'], priority = 4;
CREATE task:report SET name = 'Generate final report', status = 'pending',
    depends_on = ['task:analysis'], priority = 5;

-- Pending tasks in topological order
SELECT name, status, depends_on, priority
FROM task WHERE status = 'pending'
ORDER BY priority ASC;
-- analysis (3), visualization (4), report (5)

-- Full topological order
SELECT name, priority FROM task ORDER BY priority ASC;
```

### 19. Agent Observation Log

Append-only log of agent actions, results, and reasoning with temporal queries.

```sql
DEFINE TABLE observation SCHEMALESS;

CREATE observation:1 SET agent_id = 'agent_01',
    timestamp = d'2026-03-21T10:00:00Z', otype = 'action',
    content = 'Called web_search tool with query: IndentiaGraph features',
    metadata = { tool: 'web_search', duration_ms: 450 };
CREATE observation:2 SET agent_id = 'agent_01',
    timestamp = d'2026-03-21T10:00:01Z', otype = 'result',
    content = 'Received 5 search results about IndentiaGraph capabilities',
    metadata = { result_count: 5, relevant_count: 3 };
CREATE observation:3 SET agent_id = 'agent_01',
    timestamp = d'2026-03-21T10:00:02Z', otype = 'reasoning',
    content = 'Top results mention multi-model support and SPARQL compatibility',
    metadata = { confidence: 0.92 };

-- Chronological log for an agent
SELECT timestamp, otype, content
FROM observation WHERE agent_id = 'agent_01'
ORDER BY timestamp ASC;

-- Filter by observation type
SELECT content, metadata
FROM observation WHERE agent_id = 'agent_01' AND otype = 'reasoning';

-- Time range query
SELECT agent_id, otype, content, timestamp
FROM observation
WHERE timestamp >= d'2026-03-21T10:00:00Z'
  AND timestamp <= d'2026-03-21T10:00:03Z'
ORDER BY timestamp ASC;
```

### 20. Chain-of-Thought Reasoning

Store each reasoning step with evidence links for explainability.

```sql
DEFINE TABLE reasoning_step SCHEMALESS;

CREATE reasoning_step:s1 SET chain_id = 'chain_001', step_num = 1,
    thought = 'User asks about database performance. I need to check current metrics.',
    action = 'database_query', evidence = [],
    timestamp = d'2026-03-21T10:00:00Z';
CREATE reasoning_step:s2 SET chain_id = 'chain_001', step_num = 2,
    thought = 'Query returned high latency on the reports table. Checking index usage.',
    action = 'database_query',
    evidence = ['Query latency: 2.3s', 'Table: reports', 'Rows: 50M'],
    timestamp = d'2026-03-21T10:00:01Z';
CREATE reasoning_step:s3 SET chain_id = 'chain_001', step_num = 3,
    thought = 'No index on the date_created column. This is causing full table scans.',
    action = 'reasoning',
    evidence = ['Missing index: reports.date_created', 'Seq scan: 50M rows'],
    timestamp = d'2026-03-21T10:00:02Z';
CREATE reasoning_step:s4 SET chain_id = 'chain_001', step_num = 4,
    thought = 'Recommending to add a B-tree index on reports.date_created.',
    action = 'response',
    evidence = ['Missing index: reports.date_created', 'Expected improvement: 100x'],
    timestamp = d'2026-03-21T10:00:03Z';

-- Full reasoning chain
SELECT step_num, thought, action, evidence
FROM reasoning_step WHERE chain_id = 'chain_001'
ORDER BY step_num ASC;

-- Provenance: find all steps referencing a specific finding
SELECT step_num, thought
FROM reasoning_step
WHERE chain_id = 'chain_001'
  AND evidence CONTAINS 'Missing index: reports.date_created';
-- Returns steps 3 and 4
```

### 21. Multi-Source Knowledge Fusion

Combine knowledge from multiple sources with confidence tracking and provenance.

```sql
DEFINE TABLE knowledge SCHEMAFULL;
DEFINE FIELD topic    ON knowledge TYPE string;
DEFINE FIELD fact     ON knowledge TYPE string;
DEFINE FIELD source   ON knowledge TYPE string;
DEFINE FIELD confidence ON knowledge TYPE float;
DEFINE FIELD retrieved_at ON knowledge TYPE datetime;

CREATE knowledge:k1 SET topic = 'SurrealDB',
    fact = 'SurrealDB supports multi-model data storage',
    source = 'official_docs', confidence = 0.99,
    retrieved_at = d'2026-03-21T10:00:00Z';
CREATE knowledge:k2 SET topic = 'SurrealDB',
    fact = 'SurrealDB uses a Rust-based engine',
    source = 'github_readme', confidence = 0.95,
    retrieved_at = d'2026-03-21T10:00:01Z';
CREATE knowledge:k3 SET topic = 'SurrealDB',
    fact = 'SurrealDB supports full-text search with BM25',
    source = 'blog_post', confidence = 0.85,
    retrieved_at = d'2026-03-21T10:00:02Z';
CREATE knowledge:k4 SET topic = 'Oxigraph',
    fact = 'Oxigraph is an RDF triple store written in Rust',
    source = 'official_docs', confidence = 0.98,
    retrieved_at = d'2026-03-21T10:00:03Z';
CREATE knowledge:k5 SET topic = 'SurrealDB',
    fact = 'SurrealDB can run embedded or as a distributed cluster',
    source = 'web_search', confidence = 0.80,
    retrieved_at = d'2026-03-21T10:00:04Z';

-- Fuse: all facts about SurrealDB, ordered by confidence
SELECT fact, source, confidence
FROM knowledge WHERE topic = 'SurrealDB'
ORDER BY confidence DESC;

-- Provenance: source reliability
SELECT source, count() AS fact_count, math::mean(confidence) AS avg_confidence
FROM knowledge GROUP BY source
ORDER BY avg_confidence DESC;

-- Topic coverage
SELECT topic, count() AS fact_count
FROM knowledge GROUP BY topic ORDER BY fact_count DESC;
```

---

## Enterprise Search Patterns

### 22. Access-Controlled Search

Tag documents with access groups and filter search results by the caller's groups.

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);

DEFINE TABLE secured_doc SCHEMAFULL;
DEFINE FIELD title         ON secured_doc TYPE string;
DEFINE FIELD content       ON secured_doc TYPE string;
DEFINE FIELD access_groups ON secured_doc TYPE array<string>;
DEFINE FIELD classification ON secured_doc TYPE string;
DEFINE INDEX idx_secured_content ON secured_doc FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE secured_doc:1 SET title = 'Public API Documentation',
    content = 'The API provides endpoints for querying graph data and running SPARQL queries.',
    access_groups = ['public', 'engineering', 'management'],
    classification = 'public';
CREATE secured_doc:2 SET title = 'Internal Architecture Overview',
    content = 'The system uses a graph database with SPARQL query translation layer.',
    access_groups = ['engineering', 'management'],
    classification = 'internal';
CREATE secured_doc:3 SET title = 'Security Audit Report',
    content = 'Penetration testing of the graph query endpoints revealed no critical vulnerabilities.',
    access_groups = ['security', 'management'],
    classification = 'confidential';
CREATE secured_doc:4 SET title = 'Board Strategy Document',
    content = 'Strategic roadmap for graph database market expansion.',
    access_groups = ['management'],
    classification = 'restricted';

-- Search as engineering team member
SELECT title, classification, search::score(0) AS score
FROM secured_doc
WHERE content @0@ 'graph'
  AND access_groups CONTAINS 'engineering'
ORDER BY score DESC;
-- Returns: Public API Documentation, Internal Architecture Overview

-- Search as management
SELECT title, classification, search::score(0) AS score
FROM secured_doc
WHERE content @0@ 'graph'
  AND access_groups CONTAINS 'management'
ORDER BY score DESC;
-- Returns all 4 documents
```

### 23. Search Audit Trail

Log every search query for compliance and usage analytics.

```sql
DEFINE TABLE search_audit SCHEMALESS;

CREATE search_audit:1 SET user_id = 'user_alice',
    query_text = 'kubernetes deployment guide',
    timestamp = d'2026-03-21T09:00:00Z',
    result_count = 15, response_ms = 42,
    filters = { category: 'engineering' };
CREATE search_audit:2 SET user_id = 'user_bob',
    query_text = 'security compliance checklist',
    timestamp = d'2026-03-21T09:15:00Z',
    result_count = 8, response_ms = 38,
    filters = { category: 'security' };
CREATE search_audit:3 SET user_id = 'user_alice',
    query_text = 'helm chart configuration',
    timestamp = d'2026-03-21T09:30:00Z',
    result_count = 22, response_ms = 55,
    filters = { category: 'engineering' };

-- Analytics: searches per user
SELECT user_id, count() AS search_count
FROM search_audit GROUP BY user_id ORDER BY search_count DESC;
-- user_alice: 2, user_bob: 1

-- Average response time
SELECT math::mean(response_ms) AS avg_ms FROM search_audit GROUP ALL;

-- Compliance: audit trail for specific user in time range
SELECT query_text, timestamp, result_count
FROM search_audit
WHERE user_id = 'user_alice'
  AND timestamp >= d'2026-03-21T09:00:00Z'
  AND timestamp <= d'2026-03-21T10:00:00Z'
ORDER BY timestamp ASC;
```

### 24. Document Lifecycle

Manage document states (draft, review, published) with visibility rules.

```sql
DEFINE ANALYZER english_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);
DEFINE TABLE lifecycle_doc SCHEMALESS;
DEFINE INDEX idx_lifecycle_content ON lifecycle_doc FIELDS content
    FULLTEXT ANALYZER english_analyzer BM25(1.2, 0.75);

CREATE lifecycle_doc:1 SET title = 'API Design Guidelines',
    content = 'REST API design guidelines for consistent endpoint naming and versioning.',
    status = 'published', author = 'alice', reviewer = 'bob',
    published_at = d'2026-03-01T12:00:00Z';
CREATE lifecycle_doc:2 SET title = 'GraphQL Migration Plan',
    content = 'Plan to migrate REST endpoints to GraphQL for flexible data fetching.',
    status = 'review', author = 'bob', reviewer = 'alice',
    published_at = NONE;
CREATE lifecycle_doc:3 SET title = 'Microservices Architecture Draft',
    content = 'Draft proposal for splitting the monolith into microservices.',
    status = 'draft', author = 'carol', reviewer = NONE,
    published_at = NONE;

-- Public search: only published documents
SELECT title, status, published_at
FROM lifecycle_doc WHERE status = 'published'
ORDER BY published_at DESC;

-- Author view: own drafts + all published
SELECT title, status
FROM lifecycle_doc
WHERE author = 'carol' OR status = 'published'
ORDER BY title;

-- Promote draft to review
UPDATE lifecycle_doc:3 SET status = 'review', reviewer = 'alice';
```

### 25. Cross-Lingual Search

Search across documents in multiple languages using language filters and multilingual vector embeddings.

```sql
DEFINE ANALYZER en_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(english);
DEFINE ANALYZER nl_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(dutch);
DEFINE ANALYZER de_analyzer TOKENIZERS blank, class FILTERS lowercase, snowball(german);

DEFINE TABLE intl_doc SCHEMAFULL;
DEFINE FIELD title    ON intl_doc TYPE string;
DEFINE FIELD content  ON intl_doc TYPE string;
DEFINE FIELD language ON intl_doc TYPE string;
DEFINE FIELD embedding ON intl_doc TYPE array<float>;

CREATE intl_doc:en1 SET title = 'Security Best Practices',
    content = 'Implement strong authentication and authorization in all services.',
    language = 'en', embedding = [0.9, 0.1, 0.2, 0.05];
CREATE intl_doc:nl1 SET title = 'Beveiligingsrichtlijnen',
    content = 'Implementeer sterke authenticatie en autorisatie in alle diensten.',
    language = 'nl', embedding = [0.88, 0.12, 0.22, 0.06];
CREATE intl_doc:de1 SET title = 'Sicherheitsrichtlinien',
    content = 'Implementieren Sie starke Authentifizierung und Autorisierung in allen Diensten.',
    language = 'de', embedding = [0.87, 0.13, 0.21, 0.07];
CREATE intl_doc:en2 SET title = 'Deployment Procedures',
    content = 'Deploy applications using continuous integration and delivery pipelines.',
    language = 'en', embedding = [0.1, 0.9, 0.15, 0.08];
CREATE intl_doc:nl2 SET title = 'Uitrolprocedures',
    content = 'Rol applicaties uit met behulp van continue integratie en oplevering.',
    language = 'nl', embedding = [0.12, 0.88, 0.17, 0.09];

-- Language-filtered search: Dutch only
SELECT title, language FROM intl_doc WHERE language = 'nl' ORDER BY title;

-- Cross-lingual semantic search: find security docs across all languages
SELECT title, language,
    vector::similarity::cosine(embedding, [0.89, 0.11, 0.21, 0.06]) AS score
FROM intl_doc
ORDER BY score DESC
LIMIT 3;
-- Returns security docs in en, nl, and de (embeddings from multilingual model are language-agnostic)

-- Language distribution
SELECT language, count() AS doc_count
FROM intl_doc GROUP BY language ORDER BY doc_count DESC;
```
