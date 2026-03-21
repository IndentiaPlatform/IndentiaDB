# Data Models

IndentiaDB is a multi-model database. A single deployment handles relational, document, graph (RDF and LPG), vector, and full-text data through unified query interfaces. This document describes each model in detail and shows how they combine.

---

## 1. Relational (SurrealQL)

Traditional structured data with enforced schemas, typed fields, and SQL-like query syntax.

### Schema Definition

```sql
DEFINE TABLE employee SCHEMAFULL;
DEFINE FIELD name       ON employee TYPE string;
DEFINE FIELD email      ON employee TYPE string  ASSERT string::is::email($value);
DEFINE FIELD department ON employee TYPE record<department>;
DEFINE FIELD salary     ON employee TYPE number;
DEFINE FIELD hired      ON employee TYPE datetime;

DEFINE TABLE department SCHEMAFULL;
DEFINE FIELD name     ON department TYPE string;
DEFINE FIELD budget   ON department TYPE number;
DEFINE FIELD location ON department TYPE string;
```

### Queries

```sql
-- Basic SELECT with JOIN via record links
SELECT name, email, department.name AS dept
FROM employee
WHERE salary > 50000
ORDER BY name ASC;

-- Aggregation
SELECT department.name AS dept, count() AS headcount, math::mean(salary) AS avg_salary
FROM employee
GROUP BY department;

-- Subquery
SELECT * FROM employee
WHERE department IN (
  SELECT VALUE id FROM department WHERE budget > 1000000
);

-- LET variables for multi-step queries
LET $threshold = 75000;
SELECT name, salary FROM employee WHERE salary >= $threshold;
```

### Key Capabilities

- Strict type enforcement with `SCHEMAFULL` tables
- Field-level assertions and validation
- Record links that auto-resolve across tables
- Aggregates: `count()`, `math::sum()`, `math::mean()`, `math::min()`, `math::max()`
- Subqueries and LET variable bindings

---

## 2. Document / NoSQL (SurrealQL)

Flexible schema for semi-structured data. Fields can hold nested objects, arrays, and mixed types.

### Schema Definition

```sql
DEFINE TABLE project SCHEMALESS;
DEFINE TABLE task SCHEMALESS;
```

### Document Insertion

```sql
CREATE project CONTENT {
  name: "IndentiaDB",
  status: "active",
  metadata: {
    started: "2024-01-15",
    tags: ["database", "graph", "multi-model"],
    team_size: 5
  },
  milestones: [
    { name: "Alpha", date: "2024-06-01", completed: true },
    { name: "Beta",  date: "2024-12-01", completed: false }
  ]
};

CREATE task CONTENT {
  title: "Implement SHACL validation",
  project: project:indentiadb,
  assignee: employee:alice,
  priority: "high",
  labels: ["rdf", "validation"],
  subtasks: [
    { title: "Parse shapes graph", done: true },
    { title: "Evaluate constraints", done: false }
  ]
};
```

### Queries

```sql
-- Nested field access
SELECT name, metadata.tags, milestones[WHERE completed = true] AS done
FROM project;

-- Record link auto-resolution
SELECT title, project.name AS project_name, assignee.name AS owner
FROM task
WHERE priority = "high";

-- Array operations
SELECT * FROM project WHERE "graph" IN metadata.tags;
```

### Key Capabilities

- `SCHEMALESS` tables accept any JSON-like structure
- Nested object and array access with dot notation and array filters
- Record links (`record<table>`) enable cross-document references without explicit JOINs
- Automatic deep fetching of linked records

---

## 3. Graph RDF (SPARQL 1.2)

IndentiaDB stores and queries RDF triples natively. The SPARQL endpoint supports SPARQL 1.1, SPARQL 1.2 extensions, and RDF-star.

### Triple Model

RDF represents knowledge as triples: **subject -- predicate -- object**.

```turtle
@prefix ex:   <http://example.org/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .

ex:alice a foaf:Person ;
  foaf:name "Alice" ;
  foaf:age 30 ;
  foaf:knows ex:bob, ex:carol .

ex:bob a foaf:Person ;
  foaf:name "Bob" ;
  foaf:knows ex:alice .
```

### Named Graphs

Triples can be organized into named graphs for provenance, access control, or logical partitioning:

```sparql
INSERT DATA {
  GRAPH <http://example.org/social> {
    ex:alice foaf:knows ex:bob .
  }
  GRAPH <http://example.org/hr> {
    ex:alice ex:worksAt ex:acme .
  }
}
```

### RDF-star (Quoted Triples)

Annotate triples with metadata without reification overhead:

```sparql
INSERT DATA {
  << ex:alice foaf:knows ex:bob >> ex:since "2020-01-01"^^xsd:date ;
                                   ex:confidence 0.95 .
}
```

### SPARQL Queries

```sparql
# SELECT -- find friends of friends
SELECT ?fof ?name WHERE {
  ex:alice foaf:knows/foaf:knows ?fof .
  ?fof foaf:name ?name .
  FILTER (?fof != ex:alice)
}

# CONSTRUCT -- build a subgraph
CONSTRUCT {
  ?person foaf:name ?name .
  ?person foaf:age ?age .
}
WHERE {
  ?person a foaf:Person ; foaf:name ?name ; foaf:age ?age .
  FILTER (?age >= 25)
}

# ASK -- existence check
ASK { ex:alice foaf:knows ex:bob }

# UPDATE -- modify data
DELETE { ex:alice foaf:age ?old }
INSERT { ex:alice foaf:age 31 }
WHERE  { ex:alice foaf:age ?old }
```

### Inference (RDFS/OWL)

When inference is enabled (`QUERY_INFERENCE=true`), IndentiaDB materializes entailments:

```turtle
ex:Employee rdfs:subClassOf foaf:Person .
ex:alice a ex:Employee .
# Inferred: ex:alice a foaf:Person .
```

---

## 4. Graph LPG (Property Graph)

IndentiaDB supports a Labeled Property Graph model that can be projected from RDF data and document records. The LPG engine uses a Compressed Sparse Row (CSR) adjacency structure for efficient traversal.

### Model

- **Nodes** have one or more labels and a set of key-value properties
- **Edges** have a type and a set of key-value properties
- Both nodes and edges are addressable by ID

### Building the Projection

LPG views are derived from existing data. RDF classes become labels; RDF properties become edge types or node properties depending on whether the object is a resource or a literal.

### Traversal Queries

```sql
-- Find all nodes reachable within 3 hops
LPG TRAVERSE FROM person:alice DEPTH 3;

-- Shortest path between two nodes
LPG SHORTEST_PATH FROM person:alice TO person:dave;
```

### Graph Algorithms

```sql
-- PageRank over the Person subgraph
LPG ALGORITHM PageRank {
  label_filter: "Person",
  damping: 0.85,
  iterations: 20
};

-- Connected components
LPG ALGORITHM ConnectedComponents {
  label_filter: "Person"
};
```

### CSR Adjacency

The LPG engine stores the graph in Compressed Sparse Row format, providing:

- **O(1)** neighbor lookup for any node
- Cache-friendly memory layout for BFS/DFS traversals
- Efficient parallel algorithm execution

### Example: Social Network Analysis

```sql
-- Build LPG projection from RDF social graph
LPG PROJECT FROM GRAPH <http://example.org/social>;

-- Run PageRank to find influential people
LET $ranks = LPG ALGORITHM PageRank { label_filter: "Person", iterations: 30 };

-- Combine with relational data
SELECT person.name, $ranks[person.id] AS rank
FROM person
ORDER BY rank DESC
LIMIT 10;
```

---

## 5. Vector / Embedding

Store high-dimensional vectors alongside structured data for similarity search and retrieval-augmented generation (RAG).

### Schema Definition

```sql
DEFINE TABLE document SCHEMAFULL;
DEFINE FIELD title     ON document TYPE string;
DEFINE FIELD content   ON document TYPE string;
DEFINE FIELD embedding ON document TYPE array<float>;

-- Create an HNSW index for approximate nearest neighbor search
DEFINE INDEX idx_embedding ON document FIELDS embedding
  HNSW DIMENSION 384 DIST COSINE
  EFC 200 M 16;
```

### Inserting Vectors

```sql
CREATE document CONTENT {
  title: "Introduction to Graph Databases",
  content: "Graph databases represent data as nodes and edges...",
  embedding: [0.12, -0.34, 0.56, ...]
};
```

### Similarity Search

```sql
-- Cosine similarity search (top 10 nearest neighbors)
SELECT title, content,
  vector::similarity::cosine(embedding, $query_vector) AS score
FROM document
WHERE embedding <|10,200|> $query_vector
ORDER BY score DESC;

-- Euclidean distance search
SELECT title,
  vector::distance::euclidean(embedding, $query_vector) AS dist
FROM document
WHERE embedding <|10|> $query_vector
ORDER BY dist ASC;
```

### Hybrid Search (BM25 + Vector)

Combine full-text BM25 scoring with vector similarity for higher retrieval quality:

```sql
LET $text_results  = SELECT id, score FROM document
  WHERE content @@ "graph database" ORDER BY score DESC LIMIT 20;

LET $vector_results = SELECT id,
  vector::similarity::cosine(embedding, $query_vector) AS score
  FROM document WHERE embedding <|20,200|> $query_vector;

-- Fuse results (handled automatically via ES hybrid API)
SELECT * FROM fn::hybrid_fuse($text_results, $vector_results, 10);
```

The Elasticsearch-compatible API performs hybrid fusion automatically when both `query` and `knn` are present in a search request. The scoring algorithm is controlled by `ES_HYBRID_SCORER` (`rrf`, `bayesian`, or `linear`).

### Example: RAG Document Retrieval

```sql
-- 1. Embed the user question (done in application code)
LET $q_vec = $query_embedding;

-- 2. Retrieve relevant chunks
LET $chunks = SELECT id, title, content,
  vector::similarity::cosine(embedding, $q_vec) AS relevance
FROM document
WHERE embedding <|5,100|> $q_vec
ORDER BY relevance DESC;

-- 3. Return context for LLM generation
SELECT title, content FROM $chunks;
```

---

## 6. Full-Text Search

IndentiaDB includes a built-in full-text search engine with BM25 scoring, custom analyzers, and multi-field search.

### Analyzer Definition

```sql
DEFINE ANALYZER english_analyzer
  TOKENIZERS blank, class
  FILTERS lowercase, ascii, snowball(english), edgengram(2, 15);

DEFINE ANALYZER code_analyzer
  TOKENIZERS blank, class
  FILTERS lowercase;
```

### Index Definition

```sql
DEFINE TABLE article SCHEMAFULL;
DEFINE FIELD title   ON article TYPE string;
DEFINE FIELD body    ON article TYPE string;
DEFINE FIELD tags    ON article TYPE array<string>;

DEFINE INDEX idx_title ON article FIELDS title
  SEARCH ANALYZER english_analyzer BM25;

DEFINE INDEX idx_body ON article FIELDS body
  SEARCH ANALYZER english_analyzer BM25(1.2, 0.75);

DEFINE INDEX idx_tags ON article FIELDS tags
  SEARCH ANALYZER code_analyzer BM25;
```

### Full-Text Queries

```sql
-- Single field search
SELECT title, search::score(1) AS relevance
FROM article
WHERE title @1@ "graph database"
ORDER BY relevance DESC;

-- Multi-field search with boosting
SELECT title,
  search::score(1) * 2.0 + search::score(2) AS relevance
FROM article
WHERE title @1@ "graph database"
  OR body @2@ "graph database"
ORDER BY relevance DESC
LIMIT 20;

-- Fuzzy matching via edgengram analyzer
SELECT title FROM article
WHERE title @@ "grap datab";
```

### Example: Enterprise Document Search

```sql
DEFINE TABLE memo SCHEMAFULL;
DEFINE FIELD subject    ON memo TYPE string;
DEFINE FIELD body       ON memo TYPE string;
DEFINE FIELD author     ON memo TYPE record<employee>;
DEFINE FIELD department ON memo TYPE record<department>;
DEFINE FIELD created    ON memo TYPE datetime;

DEFINE ANALYZER memo_analyzer
  TOKENIZERS blank, class
  FILTERS lowercase, ascii, snowball(english);

DEFINE INDEX idx_memo_subject ON memo FIELDS subject SEARCH ANALYZER memo_analyzer BM25;
DEFINE INDEX idx_memo_body    ON memo FIELDS body    SEARCH ANALYZER memo_analyzer BM25;

-- Search memos with department filter
SELECT subject, author.name AS author,
  search::score(1) + search::score(2) AS relevance
FROM memo
WHERE (subject @1@ "quarterly budget" OR body @2@ "quarterly budget")
  AND department = department:finance
  AND created > "2025-01-01"
ORDER BY relevance DESC
LIMIT 10;
```

---

## Combining Models in Hybrid Queries

The true power of IndentiaDB lies in combining data models within a single query. Use SurrealQL's `LET` bindings to chain results across models.

### Example: Semantic + Graph + Relational

```sql
-- Step 1: Find entities via SPARQL (RDF graph)
LET $semantic = SPARQL("SELECT ?entity WHERE { ?entity a ex:Person }");

-- Step 2: Run PageRank on the LPG projection
LET $graph = LPG({"kind": "page_rank", "label_filter": "Person"});

-- Step 3: Combine with relational filters and sort
SELECT *
FROM $graph
WHERE id IN $semantic
ORDER BY score DESC
LIMIT 10;
```

### Example: Vector Search + RDF Enrichment

```sql
-- Step 1: Find similar documents via vector search
LET $similar = SELECT id, title,
  vector::similarity::cosine(embedding, $query_vec) AS sim
FROM document
WHERE embedding <|10,200|> $query_vec;

-- Step 2: Enrich with RDF metadata
LET $enriched = SPARQL("
  SELECT ?doc ?topic ?author WHERE {
    VALUES ?doc { $similar_ids }
    ?doc ex:hasTopic ?topic ;
         ex:writtenBy ?author .
  }
");

-- Step 3: Join and return
SELECT $similar.title, $similar.sim, $enriched.topic, $enriched.author
FROM $similar
JOIN $enriched ON $similar.id = $enriched.doc
ORDER BY sim DESC;
```

### Example: Full-Text + Graph Traversal

```sql
-- Step 1: Full-text search for relevant articles
LET $articles = SELECT id, title, search::score(1) AS relevance
FROM article
WHERE body @1@ "machine learning"
ORDER BY relevance DESC
LIMIT 20;

-- Step 2: Find related articles via graph edges
LET $related = LPG TRAVERSE FROM $articles.id DEPTH 2
WHERE edge_type = "cites";

-- Step 3: Return combined results
SELECT DISTINCT id, title FROM $related;
```
