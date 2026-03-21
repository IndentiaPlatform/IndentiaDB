# Data Models

IndentiaDB supports six data models within a single engine. This document describes each model, explains when to use it, and provides complete working examples.

---

## Overview

| Model | Query Interface | Write Interface | When to Use |
|-------|----------------|----------------|-------------|
| Relational | SurrealQL SELECT | SurrealQL CREATE / UPDATE | Structured records with typed schemas, reports, aggregations |
| Document | SurrealQL SELECT | SurrealQL CREATE / UPSERT | Semi-structured, nested JSON, flexible schemas |
| Graph RDF | SPARQL 1.2 | SPARQL UPDATE / Graph Store | Knowledge graphs, ontologies, provenance, inference |
| Graph LPG | LPG JSON DSL | Projected from RDF or documents | Traversals, shortest path, PageRank, connected components |
| Vector | SurrealQL HNSW operators | SurrealQL CREATE with embedding field | Similarity search, RAG pipelines |
| Full-Text | SurrealQL `@@` / ES Query DSL | SurrealQL CREATE with indexed field | Keyword search, fuzzy matching, BM25 ranking |

---

## 1. Relational (SurrealQL)

### What It Is

The relational model in IndentiaDB uses `SCHEMAFULL` tables — tables where every field is declared with a type, and records that violate the schema are rejected at write time. This gives you the predictability of a traditional SQL database with the ergonomics of SurrealQL.

SurrealQL record links eliminate the need for explicit `JOIN` clauses. A field of type `record<department>` automatically resolves to the referenced record during a SELECT.

### When to Use It

- You have well-defined, stable schemas
- You need aggregations, grouping, and ordered results
- You want referential integrity enforced at the field level
- You are replacing a PostgreSQL / MySQL workload

### Full Working Example

```sql
-- Define schema
DEFINE TABLE department SCHEMAFULL;
DEFINE FIELD name     ON department TYPE string;
DEFINE FIELD budget   ON department TYPE number;
DEFINE FIELD location ON department TYPE string;

DEFINE TABLE employee SCHEMAFULL;
DEFINE FIELD name       ON employee TYPE string;
DEFINE FIELD email      ON employee TYPE string ASSERT string::is::email($value);
DEFINE FIELD department ON employee TYPE record<department>;
DEFINE FIELD salary     ON employee TYPE number;
DEFINE FIELD hired      ON employee TYPE datetime;

-- Insert departments
CREATE department:engineering CONTENT {
    name: "Engineering", budget: 500000, location: "Amsterdam"
};
CREATE department:research CONTENT {
    name: "Research", budget: 300000, location: "Utrecht"
};

-- Insert employees
CREATE employee:alice CONTENT {
    name: "Alice van den Berg",
    email: "alice@example.com",
    department: department:engineering,
    salary: 85000,
    hired: d'2023-03-15T09:00:00Z'
};
CREATE employee:bob CONTENT {
    name: "Bob de Vries",
    email: "bob@example.com",
    department: department:engineering,
    salary: 92000,
    hired: d'2022-01-10T09:00:00Z'
};
CREATE employee:carol CONTENT {
    name: "Carol Jansen",
    email: "carol@example.com",
    department: department:research,
    salary: 78000,
    hired: d'2024-06-01T09:00:00Z'
};

-- Basic query: employees earning above 80k with department resolved
SELECT name, salary, department.name AS dept
FROM employee
WHERE salary > 80000
ORDER BY salary DESC;
-- Results: Bob (92000, Engineering), Alice (85000, Engineering)

-- Aggregation: average salary per department
SELECT department.name AS dept, math::mean(salary) AS avg_salary, count() AS headcount
FROM employee
GROUP BY department
ORDER BY dept;
-- Engineering: avg=88500, headcount=2; Research: avg=78000, headcount=1

-- Subquery: employees in departments with budget > 400k
SELECT name, department.name AS dept
FROM employee
WHERE department IN (
    SELECT VALUE id FROM department WHERE budget > 400000
);
-- Alice, Bob

-- Update: give Engineering a raise
UPDATE employee SET salary += 5000 WHERE department = department:engineering;
```

---

## 2. Document (SurrealQL)

### What It Is

The document model uses `SCHEMALESS` tables — tables that accept any JSON-like structure without a predefined schema. Different records in the same table can have completely different fields. This is analogous to MongoDB collections.

SurrealDB's dot-notation field access, array filters, and record links work identically in schemaless tables.

### When to Use It

- Your data structure is evolving or not yet fully defined
- You are storing heterogeneous records (different shapes per record)
- You need to model nested objects with arbitrary depth
- You are replacing a MongoDB / CouchDB workload

### Full Working Example

```sql
DEFINE TABLE project SCHEMALESS;
DEFINE TABLE task SCHEMALESS;

-- Create a project with nested metadata and milestones array
CREATE project:indentiagraph CONTENT {
    name: "IndentiaGraph",
    status: "active",
    tags: ["database", "graph", "rdf", "rust"],
    metadata: {
        started: "2024-01-15",
        lead: "Alice",
        priority: "high",
        budget: 250000
    },
    milestones: [
        { name: "Alpha", date: "2024-06-01", completed: true },
        { name: "Beta",  date: "2024-12-01", completed: true },
        { name: "GA",    date: "2025-06-01", completed: false }
    ]
};

-- Create tasks with record links to the project
CREATE task:lpg_csr CONTENT {
    title: "Implement CSR adjacency structure",
    project: project:indentiagraph,
    assignee: "Bob",
    status: "done",
    labels: ["performance", "lpg"],
    story_points: 8
};
CREATE task:sparql_engine CONTENT {
    title: "SPARQL 1.2 property path evaluation",
    project: project:indentiagraph,
    assignee: "Alice",
    status: "in_progress",
    labels: ["rdf", "sparql"],
    depends_on: [task:lpg_csr],
    story_points: 13
};

-- Nested field access
SELECT name, metadata.lead, metadata.priority
FROM project WHERE status = "active";

-- Array contains filter
SELECT title, assignee FROM task WHERE labels CONTAINS "lpg";

-- Filter array elements inline (returns only completed milestones)
SELECT milestones[WHERE completed = true] AS done_milestones
FROM project:indentiagraph;

-- Auto-resolve record link: project.name is fetched automatically
SELECT title, project.name AS project_name, assignee
FROM task
WHERE assignee = "Alice";

-- UPSERT: create or overwrite
UPSERT project:fleetapi SET
    name = "Fleet API",
    status = "active",
    metadata.lead = "Carol";

-- MERGE: partial update (only specified fields change)
UPDATE task:sparql_engine MERGE { status: "done", completed_at: time::now() };

-- DELETE with condition
DELETE task WHERE status = "done" AND story_points < 5;
```

---

## 3. Graph RDF (SPARQL 1.2)

### What It Is

IndentiaDB stores RDF triples natively in a 6-permutation index (see [Architecture](architecture.md)). The SPARQL 1.2 endpoint supports all SPARQL 1.1 features plus RDF-star quoted triples, the `TRIPLE()` function family, and the latest Working Draft changes through January 2026.

An RDF triple is a statement of fact: `(subject, predicate, object)`. Named graphs group triples into logical partitions for provenance tracking, access control, or organizational separation.

### When to Use It

- You are building a knowledge graph or ontology
- You need to represent provenance (who asserted this fact, with what confidence)
- You need to run semantic inference (RDFS/OWL entailment)
- You are federating queries across multiple SPARQL endpoints
- You need to query linked open data

### Full Working Example: Social Knowledge Graph

```sparql
# Insert data with named graphs
INSERT DATA {
    GRAPH <http://example.org/social> {
        <http://example.org/alice> a <http://xmlns.com/foaf/0.1/Person> ;
            <http://xmlns.com/foaf/0.1/name> "Alice van den Berg" ;
            <http://xmlns.com/foaf/0.1/age> 30 ;
            <http://xmlns.com/foaf/0.1/knows> <http://example.org/bob> ,
                                               <http://example.org/carol> .

        <http://example.org/bob> a <http://xmlns.com/foaf/0.1/Person> ;
            <http://xmlns.com/foaf/0.1/name> "Bob de Vries" ;
            <http://xmlns.com/foaf/0.1/age> 28 ;
            <http://xmlns.com/foaf/0.1/knows> <http://example.org/carol> .

        <http://example.org/carol> a <http://xmlns.com/foaf/0.1/Person> ;
            <http://xmlns.com/foaf/0.1/name> "Carol Jansen" ;
            <http://xmlns.com/foaf/0.1/age> 35 .
    }
}
```

```sparql
# SELECT with FILTER and OPTIONAL
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?age ?email WHERE {
    GRAPH <http://example.org/social> {
        ?person a foaf:Person ;
                foaf:name ?name ;
                foaf:age ?age .
        OPTIONAL { ?person foaf:mbox ?email }
    }
    FILTER (?age >= 29)
}
ORDER BY ?name
```

```sparql
# Property path: friends-of-friends (2 hops)
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT DISTINCT ?fof ?name WHERE {
    <http://example.org/alice> foaf:knows/foaf:knows ?fof .
    ?fof foaf:name ?name .
    FILTER (?fof != <http://example.org/alice>)
}
```

```sparql
# RDF-star: annotate a triple with provenance metadata
INSERT DATA {
    << <http://example.org/alice> <http://xmlns.com/foaf/0.1/knows> <http://example.org/bob> >>
        <http://example.org/since>      "2020-01-15"^^<http://www.w3.org/2001/XMLSchema#date> ;
        <http://example.org/confidence> "0.95"^^<http://www.w3.org/2001/XMLSchema#decimal> ;
        <http://example.org/source>     <http://example.org/linkedin_import> .
}
```

```sparql
# Query provenance via RDF-star
PREFIX ex: <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?subject ?object ?since ?confidence WHERE {
    << ?subject foaf:knows ?object >> ex:since ?since ;
                                      ex:confidence ?confidence .
    FILTER (?confidence > 0.9)
}
ORDER BY DESC(?confidence)
```

See the [SPARQL 1.2 Reference](../query-languages/sparql.md) for the complete SPARQL reference.

---

## 4. Graph LPG (LPG JSON DSL)

### What It Is

The Labeled Property Graph model represents graphs as nodes (with labels and properties) and typed edges (with properties). IndentiaDB's LPG engine builds a **Compressed Sparse Row (CSR)** adjacency structure projected from RDF triples and/or document tables.

The CSR layout provides:
- O(1) neighbor lookup for any node
- Cache-friendly memory layout for BFS/DFS traversals
- Efficient graph algorithm execution (PageRank, connected components)

**Importantly:** LPG does not have a separate write path. You write data as RDF triples or SurrealQL documents, and the LPG view is built from those sources. This means your RDF knowledge graph automatically gains graph algorithm capabilities.

### When to Use It

- You need PageRank, connected components, or other graph algorithms
- You need shortest path queries across a large graph
- You are analyzing social networks, dependency graphs, or supply chains
- You want to augment RDF data with graph-theoretic analysis

### Full Working Example

**Step 1: Write data as RDF triples**

```sparql
PREFIX ex:   <http://example.org/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

INSERT DATA {
    ex:alice a foaf:Person ; foaf:name "Alice" .
    ex:bob   a foaf:Person ; foaf:name "Bob" .
    ex:carol a foaf:Person ; foaf:name "Carol" .
    ex:dave  a foaf:Person ; foaf:name "Dave" .

    ex:alice <http://xmlns.com/foaf/0.1/knows> ex:bob .
    ex:bob   <http://xmlns.com/foaf/0.1/knows> ex:carol .
    ex:carol <http://xmlns.com/foaf/0.1/knows> ex:dave .
    ex:alice <http://xmlns.com/foaf/0.1/knows> ex:dave .
}
```

**Step 2: Query the LPG projection**

```json
POST /lpg/query

{
  "kind": {
    "Traverse": {
      "start": { "iri": "http://example.org/alice" },
      "edge": "knows",
      "direction": "Out",
      "min_hops": 1,
      "max_hops": 3,
      "target_label": "Person"
    }
  },
  "limit": 100,
  "return_fields": ["id", "name", "hop_count"]
}
```

**Shortest path:**

```json
POST /lpg/query

{
  "kind": {
    "ShortestPath": {
      "start":  { "iri": "http://example.org/alice" },
      "target": { "iri": "http://example.org/carol" },
      "edge": "knows",
      "direction": "Out"
    }
  },
  "limit": 1,
  "return_fields": ["path", "length"]
}
```

**PageRank:**

```json
POST /lpg/query

{
  "kind": {
    "PageRank": {
      "damping": 0.85,
      "max_iterations": 100,
      "tolerance": 1e-8,
      "label_filter": "Person"
    }
  },
  "limit": 100,
  "return_fields": ["id", "score"]
}
```

See the [LPG Reference](../query-languages/lpg.md) for the complete JSON DSL specification.

---

## 5. Vector / Embeddings

### What It Is

IndentiaDB stores high-dimensional embedding vectors alongside structured data fields in the same record. Vectors are indexed using HNSW (Hierarchical Navigable Small World), an approximate nearest neighbor algorithm that provides O(log n) search time with tunable recall.

This enables vector similarity search (semantic search, image similarity, recommendation) without a separate vector database.

### When to Use It

- You are building a RAG (Retrieval-Augmented Generation) pipeline
- You need semantic search beyond keyword matching
- You are comparing embeddings from an ML model (text, image, audio)
- You want to store vectors alongside metadata without a separate system

### Full Working Example

```sql
-- Define table with embedding field
DEFINE TABLE document SCHEMAFULL;
DEFINE FIELD title     ON document TYPE string;
DEFINE FIELD content   ON document TYPE string;
DEFINE FIELD source    ON document TYPE string;
DEFINE FIELD embedding ON document TYPE array<float>;

-- Define HNSW index (1536-dimensional, OpenAI text-embedding-3-small compatible)
DEFINE INDEX idx_embedding ON document FIELDS embedding
    HNSW DIMENSION 1536 DIST COSINE
    EFC 200 M 16;

-- Insert documents with pre-computed embeddings (embedding values abbreviated)
CREATE document:doc1 CONTENT {
    title:   "Introduction to Knowledge Graphs",
    content: "Knowledge graphs represent real-world entities and their relationships...",
    source:  "internal_wiki",
    embedding: [0.023, -0.041, 0.087, /* ... 1536 floats total ... */]
};
CREATE document:doc2 CONTENT {
    title:   "SPARQL 1.2 Working Draft",
    content: "SPARQL is the W3C query language for RDF data...",
    source:  "w3c_spec",
    embedding: [0.015, -0.033, 0.091, /* ... */]
};

-- Similarity search: find 5 most relevant documents for a query vector
LET $query_vec = [0.021, -0.039, 0.085, /* ... */];

SELECT id, title, source,
    vector::similarity::cosine(embedding, $query_vec) AS score
FROM document
WHERE embedding <|5,200|> $query_vec
ORDER BY score DESC;

-- Euclidean distance search
SELECT id, title,
    vector::distance::euclidean(embedding, $query_vec) AS distance
FROM document
WHERE embedding <|5|> $query_vec
ORDER BY distance ASC;

-- Hybrid search: combine BM25 keyword score with vector similarity
DEFINE INDEX idx_content ON document FIELDS content
    SEARCH ANALYZER english_analyzer BM25;

LET $text_score  = search::score(1);
LET $vec_score   = vector::similarity::cosine(embedding, $query_vec);

SELECT id, title,
    ($text_score * 0.4 + $vec_score * 0.6) AS combined_score
FROM document
WHERE content @1@ "knowledge graph"
  AND embedding <|20,200|> $query_vec
ORDER BY combined_score DESC
LIMIT 10;

-- RAG context retrieval pattern
LET $context_chunks = (
    SELECT title, content,
        vector::similarity::cosine(embedding, $query_vec) AS relevance
    FROM document
    WHERE embedding <|5,100|> $query_vec
    ORDER BY relevance DESC
);

-- Return context for LLM prompt construction
SELECT title, content FROM $context_chunks;
```

---

## 6. Full-Text Search (BM25)

### What It Is

IndentiaDB includes a built-in full-text search engine based on BM25/TF-IDF ranking. Text fields are indexed using configurable analyzers that control tokenization, normalization (lowercase, ASCII folding), stemming, and n-gram generation. Search uses BM25 scoring with optional field boosting.

The Elasticsearch-compatible API on port 9200 exposes the same search capability through the Elasticsearch-compatible Query DSL, enabling drop-in compatibility with ES client libraries.

### When to Use It

- You need ranked keyword search over text fields
- You need fuzzy matching (typo tolerance)
- You need phrase queries or proximity scoring
- You are replacing an Elasticsearch / OpenSearch workload
- You want to combine full-text search with vector similarity (hybrid search)

### Full Working Example

```sql
-- Define analyzers
DEFINE ANALYZER english_content
    TOKENIZERS blank, class
    FILTERS lowercase, ascii, snowball(english), edgengram(2, 15);

DEFINE ANALYZER exact_match
    TOKENIZERS blank
    FILTERS lowercase, ascii;

-- Define table and search indexes
DEFINE TABLE article SCHEMAFULL;
DEFINE FIELD title      ON article TYPE string;
DEFINE FIELD body       ON article TYPE string;
DEFINE FIELD author     ON article TYPE string;
DEFINE FIELD tags       ON article TYPE array<string>;
DEFINE FIELD published  ON article TYPE datetime;

DEFINE INDEX idx_title  ON article FIELDS title  SEARCH ANALYZER english_content  BM25(1.2, 0.75);
DEFINE INDEX idx_body   ON article FIELDS body   SEARCH ANALYZER english_content  BM25(1.2, 0.75);
DEFINE INDEX idx_tags   ON article FIELDS tags   SEARCH ANALYZER exact_match       BM25;

-- Insert articles
CREATE article:a1 CONTENT {
    title:     "Building Knowledge Graphs with SPARQL",
    body:      "SPARQL enables complex querying of RDF knowledge graphs...",
    author:    "Alice",
    tags:      ["sparql", "rdf", "knowledge-graph"],
    published: d'2025-03-01T00:00:00Z'
};
CREATE article:a2 CONTENT {
    title:     "Vector Search in Rust",
    body:      "HNSW (Hierarchical Navigable Small World) enables fast approximate nearest neighbor search...",
    author:    "Bob",
    tags:      ["vector", "rust", "hnsw"],
    published: d'2025-04-15T00:00:00Z'
};
CREATE article:a3 CONTENT {
    title:     "Multi-Model Databases Explained",
    body:      "Modern applications need relational, document, graph, vector, and full-text search in one system...",
    author:    "Carol",
    tags:      ["database", "multi-model"],
    published: d'2025-05-10T00:00:00Z'
};

-- Single-field full-text search (title only)
SELECT title, search::score(1) AS relevance
FROM article
WHERE title @1@ "knowledge graph"
ORDER BY relevance DESC;

-- Multi-field search with boosted title (title score × 2 + body score)
SELECT title, author,
    search::score(1) * 2.0 + search::score(2) AS relevance
FROM article
WHERE title @1@ "graph"
   OR body   @2@ "graph"
ORDER BY relevance DESC
LIMIT 10;

-- Fuzzy prefix matching (edgengram allows partial tokens)
SELECT title FROM article WHERE title @1@ "knowl";
-- Returns "Building Knowledge Graphs..." because of edgengram(2,15)

-- Combined: full-text + date filter + tag filter
SELECT title, author, published,
    search::score(1) + search::score(2) AS relevance
FROM article
WHERE (title @1@ "database" OR body @2@ "database")
  AND published > d'2025-01-01T00:00:00Z'
ORDER BY relevance DESC;

-- Elasticsearch-compatible API (port 9200)
-- POST http://localhost:9200/article/_search
-- {
--   "query": {
--     "multi_match": {
--       "query": "knowledge graph",
--       "fields": ["title^2", "body"],
--       "fuzziness": "AUTO"
--     }
--   },
--   "size": 10
-- }
```

---

## Combining Models

The true power of IndentiaDB is combining these models in a single query or transaction. See [Hybrid Queries](../query-languages/hybrid-queries.md) for detailed multi-model examples including:

- RDF SPARQL results fed into SurrealQL document queries
- Vector similarity search enriched with RDF metadata
- Full-text search results traversed via LPG graph edges
- Knowledge graph analytics with results stored in document tables
